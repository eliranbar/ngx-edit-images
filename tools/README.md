# License tooling

Generate Ed25519 key pairs and signed license keys for `ngx-image-editor` premium
features. Identical in shape to the tooling in every other E.B Dev & Design
package repo — same file names, same flags, same rules.

```bash
# Create a new key pair (store the private key securely; never commit it)
node tools/generate-license.mjs --keypair

# Issue a license (reads tools/license-private-<kid>.key, or $NIE_LICENSE_PRIVATE_KEY)
node tools/generate-license.mjs --licensee "Acme Inc" --domains "acme.com,*.acme.com"

# Custom term and feature list
node tools/generate-license.mjs --licensee "Acme Inc" --domains "*.acme.com" \
  --expiry 2027-06-30 --features "brush,masks"
```

| Flag | Default | Notes |
| --- | --- | --- |
| `--domains` | **required** | Comma-separated hostnames. `*.acme.com` covers the apex and all subdomains. `*` deliberately allows any host — avoid. |
| `--expiry` | one year from today | `YYYY-MM-DD`. Honoured through the whole of that day in every timezone. |
| `--features` | all premium features | Ids from `NIE_FEATURES`. |
| `--licensee` | `Unknown` | Recorded in the payload; shows up in support requests. |
| `--plan` | `premium` | |
| `--product` | `@ebdev/ngx-image-editor` | Rejected by any other package, even with a valid signature. |
| `--kid` | `nie-2026-08` | Signing generation. **Must exist in the client keyring** or the key verifies nowhere. |
| `--private-key` | `tools/license-private-<kid>.key`, else `tools/license-private.key` | Falls back to `$NIE_LICENSE_PRIVATE_KEY`. |

Local development hosts (`localhost`, `127.0.0.1`, `0.0.0.0`, `*.localhost`) bypass
domain binding, so customers do not need a key for `ng serve` or CI.

Embed only **public** keys, in `projects/ngx-image-editor/src/lib/license/public-key.ts`.

## Two rules that keep this system recoverable

**1. One keypair per product, forever.** Never sign a license for another package
with this key. The `product` field is a convenience for support and for newer
clients; the real guarantee is that a key for `@ebdev/ngx-richtext` is
mathematically unable to verify against `ngx-image-editor`'s public key — and that
holds even in versions shipped before `product` existed.

**2. Publish the successor key about a year before it signs anything.** The client
trusts every key in `NIE_LICENSE_KEYRING`, so rotation only works if the *next*
key is already in customers' hands. `nie-2027-08` shipped in v0.2.0 and signs
nothing yet.

## Regenerated in v0.2.0 — read this before debugging a bad key

The keyring published in **v0.1.0 was unusable**. Both public keys were embedded
without their private halves ever reaching the issuing server, so nothing could
sign for this product and no license was ever issued against them. v0.2.0
replaces both entries with keys whose private halves are in the secret store.

Consequence: a purchased key **does not verify on v0.1.0**. The failure is
`invalid-signature`. The fix is upgrading to ≥0.2.0. Nothing was invalidated by
the swap, because nothing had been signed.

## Planned rotation

Because the successor is pre-staged, this is routine and customer-invisible.

1. Start issuing with `--kid nie-2027-08` (its private key is already in your
   secret store from when it was generated). On the server that is a one-line
   change to `KeyringService.REGISTRY` in the ebdev-design repo.
2. Generate the *next* successor, add its public key to the keyring, and publish a
   release. You are now a year ahead again.
3. Existing keys signed by `nie-2026-08` keep verifying until they expire. Nothing
   needs reissuing.

## Emergency rotation (private key compromised)

Keys signed by the compromised generation cannot be un-issued — offline
verification has no revocation. Damage is bounded by their remaining term, which
for a monthly subscription is at most 44 days.

1. Stop issuing with the compromised `kid` immediately.
2. Switch issuance to the pre-staged successor.
3. **Remove the compromised entry from `NIE_LICENSE_KEYRING`** and publish. This
   invalidates every key that generation signed, so reissue all affected customers
   from the successor *before* the release goes out.
4. Generate and pre-stage a fresh successor.

## Key files

`tools/license-private*.key` and `tools/*.pkcs8.b64` are gitignored. Each holds a
base64 PKCS#8 DER private key, mode `0600`.

| File | Generation | Status |
| --- | --- | --- |
| `tools/license-private.key` | `nie-2026-08` | **Active** — signs today's licenses |
| `tools/license-private-nie-2027-08.key` | `nie-2027-08` | Pre-staged successor — trusted by clients, signs nothing yet |

The active key is also the source of `secrets/nie_signing_key` in the
`ebdev-design` repo (and of `/etc/ebdev/secrets/nie_signing_key` on the box) —
that copy is what the sales API signs with. The two must stay byte-identical;
`KeyringService` logs the public half at boot so you can compare it against the
keyring above.

Back both up outside this machine. Losing the active key means no new licenses;
losing the successor means an emergency rotation has no landing ground.
