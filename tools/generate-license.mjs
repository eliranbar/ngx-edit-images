#!/usr/bin/env node
/**
 * Generate Ed25519 license keys for ngx-image-editor.
 *
 * Usage:
 *   node tools/generate-license.mjs --licensee "Acme Inc" --domains "*.acme.com"
 *   node tools/generate-license.mjs --keypair
 */
import {
  generateKeyPairSync,
  sign,
  createPrivateKey,
} from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--keypair') out.keypair = true;
    else if (a.startsWith('--')) {
      out[a.slice(2)] = argv[++i];
    }
  }
  return out;
}

function b64(buf) {
  return Buffer.from(buf).toString('base64');
}

function oneYearFromNow() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

const args = parseArgs(process.argv);

if (args.keypair) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  console.log('PUBLIC_KEY_B64=' + b64(publicKey.export({ type: 'spki', format: 'der' })));
  console.log('PRIVATE_KEY_B64=' + b64(privateKey.export({ type: 'pkcs8', format: 'der' })));
  process.exit(0);
}

const kid = args.kid ?? 'nie-2026-08';
const product = args.product ?? '@ebdev/ngx-image-editor';

const defaultPrivPath = existsSync(resolve(`tools/license-private-${kid}.key`))
  ? resolve(`tools/license-private-${kid}.key`)
  : resolve('tools/license-private.key');

const privPath = args['private-key'] ?? defaultPrivPath;
let privateKey;
if (existsSync(privPath)) {
  const raw = readFileSync(privPath, 'utf8').trim();
  privateKey = createPrivateKey({
    key: Buffer.from(raw, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
} else if (process.env.NIE_LICENSE_PRIVATE_KEY) {
  privateKey = createPrivateKey({
    key: Buffer.from(process.env.NIE_LICENSE_PRIVATE_KEY, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
} else {
  console.error(
    'Missing private key. Set NIE_LICENSE_PRIVATE_KEY or create tools/license-private.key',
  );
  process.exit(1);
}

// Empty --features with plan premium/pro unlocks all current PREMIUM_FEATURES at runtime.
const features = (
  args.features ??
  'brush,eraser,masks,groups,blendModes,advancedSelection,cloneStamp,healing,perspective,warp,layerStyles,adjustmentLayers,nonDestructiveFilters,extendedFilters,exportSvg,pdf,psd,raw,colorManagement'
)
  .split(',')
  .map((f) => f.trim())
  .filter(Boolean);

const domains = (args.domains ?? '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

if (domains.length === 0) {
  console.error('Pass --domains with at least one hostname (e.g. "*.acme.com,localhost").');
  process.exit(1);
}

const payload = {
  plan: args.plan ?? 'premium',
  features,
  expiry: args.expiry ?? oneYearFromNow(),
  licensee: args.licensee ?? 'Unknown',
  domains,
  product,
  kid,
};

const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
const signature = sign(null, payloadBytes, privateKey);
const envelope = {
  p: b64(payloadBytes),
  s: b64(signature),
};
const key = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');

console.log(key);
console.log('\n# Payload:');
console.log(JSON.stringify(payload, null, 2));
