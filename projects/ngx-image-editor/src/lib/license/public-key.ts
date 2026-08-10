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
 */
export const NIE_LICENSE_KEYRING: readonly NieLicensePublicKey[] = [
  { kid: 'nie-2026-08', spkiB64: 'MCowBQYDK2VwAyEAySGJR1l990pYi2uXUkNdcICvxEQB0aJ78sRS61Ktktg=' },
  { kid: 'nie-2027-08', spkiB64: 'MCowBQYDK2VwAyEA8Y5ub3X+xUSQjrPA8MALLGWSCWZjyU42sYFXD4qRXX4=' },
];

/**
 * The currently-issuing key.
 * @deprecated Prefer {@link NIE_LICENSE_KEYRING}.
 */
export const NIE_LICENSE_PUBLIC_KEY_B64 = NIE_LICENSE_KEYRING[0].spkiB64;
