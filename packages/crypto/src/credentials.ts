import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

/**
 * RevSport credentials structure
 */
export interface RevSportCredentials {
  username: string;
  password: string;
}

/**
 * Encrypted payload structure (stored in database)
 */
interface EncryptedPayload {
  /** Version for future format changes */
  v: 1;
  /** Initialization vector (base64) */
  iv: string;
  /** Authentication tag (base64) */
  tag: string;
  /** Encrypted data (base64) */
  data: string;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 16; // 128 bits

/**
 * Validate encryption key format.
 * Key must be exactly 32 bytes (256 bits) for AES-256.
 *
 * @param key - The encryption key (hex string or Buffer)
 * @returns Buffer containing the key
 * @throws Error if key is invalid
 */
export function validateKey(key: string | Buffer): Buffer {
  if (Buffer.isBuffer(key)) {
    if (key.length !== 32) {
      throw new Error(`Encryption key must be exactly 32 bytes, got ${key.length}`);
    }
    return key;
  }

  // Assume hex-encoded string
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error(
      `Encryption key must be 64 hex characters (32 bytes), got ${key.length} characters`
    );
  }
  return keyBuffer;
}

/**
 * Generate a new encryption key.
 * Use this to generate ENCRYPTION_KEY for environment variables.
 *
 * @returns Hex-encoded 32-byte key
 */
export function generateKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Encrypt RevSport credentials using AES-256-GCM.
 *
 * The encrypted payload includes:
 * - Version number for future format changes
 * - Random IV (initialization vector)
 * - Authentication tag for integrity verification
 * - Encrypted credential data
 *
 * @param credentials - The credentials to encrypt
 * @param key - The encryption key (hex string or 32-byte Buffer)
 * @returns JSON string of encrypted payload (safe to store in database)
 *
 * @example
 * ```ts
 * const encrypted = encryptCredentials(
 *   { username: 'admin', password: 'secret' },
 *   process.env.ENCRYPTION_KEY
 * );
 * // Store `encrypted` in clubs.data_source_config.credentials_encrypted
 * ```
 */
export function encryptCredentials(
  credentials: RevSportCredentials,
  key: string | Buffer
): string {
  const keyBuffer = validateKey(key);

  // Generate random IV
  const iv = randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: TAG_LENGTH,
  });

  // Encrypt
  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  // Get auth tag
  const tag = cipher.getAuthTag();

  // Build payload
  const payload: EncryptedPayload = {
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt RevSport credentials using AES-256-GCM.
 *
 * @param encryptedJson - The encrypted payload (JSON string from encryptCredentials)
 * @param key - The encryption key (hex string or 32-byte Buffer)
 * @returns The decrypted credentials
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 *
 * @example
 * ```ts
 * const credentials = decryptCredentials(
 *   club.dataSourceConfig.credentials_encrypted,
 *   process.env.ENCRYPTION_KEY
 * );
 * // Use credentials.username and credentials.password
 * ```
 */
export function decryptCredentials(
  encryptedJson: string,
  key: string | Buffer
): RevSportCredentials {
  const keyBuffer = validateKey(key);

  // Parse payload
  let payload: EncryptedPayload;
  try {
    payload = JSON.parse(encryptedJson);
  } catch {
    throw new Error('Invalid encrypted payload: not valid JSON');
  }

  // Validate version
  if (payload.v !== 1) {
    throw new Error(`Unsupported encryption version: ${payload.v}`);
  }

  // Decode components
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const encrypted = Buffer.from(payload.data, 'base64');

  // Validate lengths
  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length');
  }
  if (tag.length !== TAG_LENGTH) {
    throw new Error('Invalid auth tag length');
  }

  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  // Decrypt
  let decrypted: string;
  try {
    decrypted = decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  } catch (error) {
    // GCM authentication failed - wrong key or tampered data
    throw new Error('Decryption failed: invalid key or corrupted data');
  }

  // Parse credentials
  let credentials: RevSportCredentials;
  try {
    credentials = JSON.parse(decrypted);
  } catch {
    throw new Error('Decryption failed: invalid credential format');
  }

  // Validate structure
  if (typeof credentials.username !== 'string' || typeof credentials.password !== 'string') {
    throw new Error('Decryption failed: invalid credential structure');
  }

  return credentials;
}

/**
 * Re-encrypt credentials with a new key.
 * Use this during key rotation.
 *
 * @param encryptedJson - The encrypted payload (with old key)
 * @param oldKey - The current encryption key
 * @param newKey - The new encryption key
 * @returns New encrypted payload (with new key)
 *
 * @example
 * ```ts
 * // During key rotation, re-encrypt all club credentials
 * for (const club of clubs) {
 *   const newEncrypted = rotateCredentials(
 *     club.dataSourceConfig.credentials_encrypted,
 *     oldKey,
 *     newKey
 *   );
 *   await updateClubCredentials(club.id, newEncrypted);
 * }
 * ```
 */
export function rotateCredentials(
  encryptedJson: string,
  oldKey: string | Buffer,
  newKey: string | Buffer
): string {
  const credentials = decryptCredentials(encryptedJson, oldKey);
  return encryptCredentials(credentials, newKey);
}
