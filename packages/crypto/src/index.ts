/**
 * @lmrc/crypto - Encryption utilities for credential storage
 *
 * This package provides AES-256-GCM encryption for storing sensitive
 * credentials (like RevSport login details) in the database.
 *
 * ## Security Features
 * - AES-256-GCM authenticated encryption
 * - Random IV per encryption (no IV reuse)
 * - Authentication tag prevents tampering
 * - Versioned payload format for future upgrades
 *
 * ## Key Management
 * - Generate key: `generateKey()` → store in ENCRYPTION_KEY env var
 * - Key must be 32 bytes (64 hex characters)
 * - Never commit keys to source control
 * - Use different keys per environment (dev/staging/prod)
 *
 * ## Key Rotation
 * Use `rotateCredentials()` to re-encrypt with a new key:
 * 1. Generate new key: `const newKey = generateKey()`
 * 2. Re-encrypt all credentials with `rotateCredentials(encrypted, oldKey, newKey)`
 * 3. Update ENCRYPTION_KEY env var to new key
 * 4. Deploy and verify
 * 5. Securely delete old key
 *
 * @example
 * ```ts
 * import { encryptCredentials, decryptCredentials, generateKey } from '@lmrc/crypto';
 *
 * // Generate a new key (do this once, store in env var)
 * const key = generateKey();
 * console.log(`ENCRYPTION_KEY=${key}`);
 *
 * // Encrypt credentials before storing
 * const encrypted = encryptCredentials(
 *   { username: 'club_admin', password: 'secret123' },
 *   process.env.ENCRYPTION_KEY
 * );
 *
 * // Decrypt when needed (e.g., for scraping)
 * const creds = decryptCredentials(encrypted, process.env.ENCRYPTION_KEY);
 * ```
 */

export {
  encryptCredentials,
  decryptCredentials,
  rotateCredentials,
  generateKey,
  validateKey,
  type RevSportCredentials,
} from './credentials.js';
