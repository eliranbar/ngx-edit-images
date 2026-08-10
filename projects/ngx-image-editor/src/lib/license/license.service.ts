import { Injectable, inject } from '@angular/core';
import { NIE_CONFIG } from '../config/tokens';
import { NieFeatureId, PREMIUM_FEATURES } from '../config/features';
import { NIE_LICENSE_KEYRING, NIE_PRODUCT_ID } from './public-key';

export interface LicensePayload {
  plan: string;
  features: NieFeatureId[];
  expiry: string;
  licensee: string;
  domains?: string[];
  product?: string;
  kid?: string;
}

export type LicenseFailureReason =
  | 'not-verified'
  | 'missing-key'
  | 'parse-error'
  | 'no-crypto'
  | 'invalid-signature'
  | 'product-mismatch'
  | 'expired'
  | 'domain-mismatch';

export interface LicenseState {
  valid: boolean;
  payload: LicensePayload | null;
  reason?: LicenseFailureReason;
}

const DEVELOPMENT_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '']);
const EXPIRY_GRACE_MS = 24 * 60 * 60 * 1000;

function isDevelopmentHost(hostname: string): boolean {
  return DEVELOPMENT_HOSTS.has(hostname) || hostname.endsWith('.localhost');
}

function matchesDomain(domains: readonly string[] | undefined, hostname: string): boolean {
  if (!domains || domains.length === 0) {
    return true;
  }
  return domains.some((raw) => {
    const pattern = raw.trim().toLowerCase();
    if (!pattern) {
      return false;
    }
    if (pattern === '*') {
      return true;
    }
    if (pattern.startsWith('*.')) {
      const apex = pattern.slice(2);
      return hostname === apex || hostname.endsWith('.' + apex);
    }
    return hostname === pattern;
  });
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

type SignatureVerifier = (
  payload: Uint8Array<ArrayBuffer>,
  signature: Uint8Array<ArrayBuffer>,
  spki: Uint8Array<ArrayBuffer>,
) => Promise<boolean>;

async function webCryptoVerifier(): Promise<SignatureVerifier | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return null;
  }
  try {
    await subtle.importKey(
      'spki',
      base64ToBytes(NIE_LICENSE_KEYRING[0].spkiB64),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
  } catch {
    return null;
  }
  return async (payload, signature, spki) => {
    const key = await subtle.importKey('spki', spki, { name: 'Ed25519' }, false, ['verify']);
    return subtle.verify('Ed25519', key, signature, payload);
  };
}

async function nobleVerifier(): Promise<SignatureVerifier> {
  const [ed, sha2] = await Promise.all([
    import('@noble/ed25519'),
    import('@noble/hashes/sha2.js'),
  ]);
  ed.hashes.sha512 = (message) => sha2.sha512(message as Uint8Array);
  ed.hashes.sha512Async = async (message) => sha2.sha512(message as Uint8Array);
  return async (payload, signature, spki) => {
    const raw = spki.subarray(spki.length - 32);
    try {
      return await ed.verifyAsync(signature, payload, raw);
    } catch {
      return false;
    }
  };
}

let verifierPromise: Promise<SignatureVerifier> | null = null;

function resolveVerifier(): Promise<SignatureVerifier> {
  verifierPromise ??= webCryptoVerifier().then((native) => native ?? nobleVerifier());
  return verifierPromise;
}

export function resetLicenseVerifierForTesting(): void {
  verifierPromise = null;
}

@Injectable()
export class LicenseService {
  private readonly config = inject(NIE_CONFIG);
  private state: LicenseState = { valid: false, payload: null, reason: 'not-verified' };
  private pending: Promise<LicenseState> | null = null;

  verify(): Promise<LicenseState> {
    this.pending ??= this.runVerify();
    return this.pending;
  }

  private async runVerify(): Promise<LicenseState> {
    const key = this.config.licenseKey?.trim();
    if (!key) {
      return this.settle(false, null, 'missing-key');
    }

    let payloadBytes: Uint8Array<ArrayBuffer>;
    let signatureBytes: Uint8Array<ArrayBuffer>;
    let payload: LicensePayload;
    try {
      const envelope = JSON.parse(atob(key)) as { p: string; s: string };
      payloadBytes = base64ToBytes(envelope.p);
      signatureBytes = base64ToBytes(envelope.s);
      payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as LicensePayload;
    } catch (err) {
      console.warn('[ngx-image-editor] Could not read license key — running in free tier.', err);
      return this.settle(false, null, 'parse-error');
    }

    let verify: SignatureVerifier;
    try {
      verify = await resolveVerifier();
    } catch (err) {
      console.warn(
        '[ngx-image-editor] No Ed25519 implementation available — running in free tier.',
        err,
      );
      return this.settle(false, payload, 'no-crypto');
    }

    const named = NIE_LICENSE_KEYRING.filter((k) => k.kid === payload.kid);
    const candidates = named.length > 0 ? named : NIE_LICENSE_KEYRING;
    let verified = false;
    for (const candidate of candidates) {
      if (await verify(payloadBytes, signatureBytes, base64ToBytes(candidate.spkiB64))) {
        verified = true;
        break;
      }
    }
    if (!verified) {
      console.warn('[ngx-image-editor] Invalid license signature — running in free tier.');
      return this.settle(false, null, 'invalid-signature');
    }

    if (payload.product && payload.product !== NIE_PRODUCT_ID) {
      console.warn(
        `[ngx-image-editor] License was issued for "${payload.product}", not ${NIE_PRODUCT_ID} — ` +
          'running in free tier.',
      );
      return this.settle(false, payload, 'product-mismatch');
    }

    const expiresAt = payload.expiry ? Date.parse(payload.expiry) : NaN;
    if (Number.isFinite(expiresAt) && expiresAt + EXPIRY_GRACE_MS < Date.now()) {
      console.warn(
        `[ngx-image-editor] License expired on ${payload.expiry} — running in free tier.`,
      );
      return this.settle(false, payload, 'expired');
    }

    const hostname = this.currentHostname();
    if (!isDevelopmentHost(hostname) && !matchesDomain(payload.domains, hostname)) {
      console.warn(
        `[ngx-image-editor] License is not valid for "${hostname}" ` +
          `(licensed: ${payload.domains?.join(', ')}) — running in free tier.`,
      );
      return this.settle(false, payload, 'domain-mismatch');
    }

    return this.settle(true, payload);
  }

  private settle(
    valid: boolean,
    payload: LicensePayload | null,
    reason?: LicenseFailureReason,
  ): LicenseState {
    this.state = reason ? { valid, payload, reason } : { valid, payload };
    return this.state;
  }

  getState(): LicenseState {
    return this.state;
  }

  isPremiumUnlocked(): boolean {
    return this.state.valid;
  }

  getLicensedFeatures(): readonly NieFeatureId[] {
    if (!this.state.valid || !this.state.payload) {
      return [];
    }
    const listed = this.state.payload.features ?? [];
    if (
      listed.length === 0 &&
      (this.state.payload.plan === 'premium' || this.state.payload.plan === 'pro')
    ) {
      return PREMIUM_FEATURES;
    }
    return listed;
  }

  private currentHostname(): string {
    const host = globalThis.location?.hostname ?? '';
    return host.toLowerCase().replace(/^\[|\]$/g, '');
  }
}
