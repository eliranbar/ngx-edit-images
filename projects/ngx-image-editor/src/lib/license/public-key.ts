/**
 * License identity for this package: which product keys must be issued for, and
 * which Ed25519 public keys are trusted to sign them.
 */

export const NIE_PRODUCT_ID = '@ebdev/ngx-image-editor';

export interface NieLicensePublicKey {
  /** Stable identifier stamped into the payload as `kid`. */
  readonly kid: string;
  /** Ed25519 public key, SPKI DER, base64. */
  readonly spkiB64: string;
}

/**
 * Trusted signing keys, newest last. A key is verified against the entry named
 * by its `kid`, or against every entry when it carries no `kid`.
 *
 * **The successor is published roughly a year before it signs anything.** That is
 * what makes rotation survivable: by the time `nie-2027-08` starts issuing keys,
 * the clients that must accept them have shipped.
 *
 * Both entries were regenerated for v0.2.0. The pair shipped in v0.1.0 was
 * unusable — no private half of it ever reached the issuing server, so no
 * licence was ever signed against it and replacing it invalidates nothing.
 * Anyone on v0.1.0 must upgrade to have a purchased key verify.
 */
export const NIE_LICENSE_KEYRING: readonly NieLicensePublicKey[] = [
  { kid: 'nie-2026-08', spkiB64: 'MCowBQYDK2VwAyEA8rLyG7DxVQKyknIsP3cgxRivIjqPUS1+CfsgTRU9lsY=' },
  { kid: 'nie-2027-08', spkiB64: 'MCowBQYDK2VwAyEAaLkhc72IyFItGuutKhvNZ52uHxqHDTTnEzJF+n2d3S0=' },
];

/**
 * The currently-issuing key.
 * @deprecated Prefer {@link NIE_LICENSE_KEYRING}.
 */
export const NIE_LICENSE_PUBLIC_KEY_B64 = NIE_LICENSE_KEYRING[0].spkiB64;
