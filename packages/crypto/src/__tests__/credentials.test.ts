import { describe, it, expect } from 'vitest';
import {
  encryptCredentials,
  decryptCredentials,
  rotateCredentials,
  generateKey,
  validateKey,
} from '../credentials.js';

describe('generateKey', () => {
  it('generates a 64-character hex string', () => {
    const key = generateKey();
    expect(key).toHaveLength(64);
    expect(/^[0-9a-f]+$/i.test(key)).toBe(true);
  });

  it('generates unique keys each time', () => {
    const key1 = generateKey();
    const key2 = generateKey();
    expect(key1).not.toBe(key2);
  });
});

describe('validateKey', () => {
  it('accepts valid hex string key', () => {
    const key = generateKey();
    const buffer = validateKey(key);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBe(32);
  });

  it('accepts valid Buffer key', () => {
    const key = Buffer.alloc(32, 'a');
    const buffer = validateKey(key);
    expect(buffer).toBe(key);
  });

  it('rejects short hex key', () => {
    expect(() => validateKey('abcd1234')).toThrow('64 hex characters');
  });

  it('rejects long hex key', () => {
    const longKey = 'a'.repeat(128);
    expect(() => validateKey(longKey)).toThrow('64 hex characters');
  });

  it('rejects short Buffer key', () => {
    const shortBuffer = Buffer.alloc(16);
    expect(() => validateKey(shortBuffer)).toThrow('32 bytes');
  });
});

describe('encryptCredentials / decryptCredentials', () => {
  const testKey = generateKey();
  const testCredentials = { username: 'test_user', password: 'test_password123!' };

  it('encrypts and decrypts credentials correctly', () => {
    const encrypted = encryptCredentials(testCredentials, testKey);
    const decrypted = decryptCredentials(encrypted, testKey);

    expect(decrypted).toEqual(testCredentials);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const encrypted1 = encryptCredentials(testCredentials, testKey);
    const encrypted2 = encryptCredentials(testCredentials, testKey);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it('encrypted output is valid JSON', () => {
    const encrypted = encryptCredentials(testCredentials, testKey);
    const parsed = JSON.parse(encrypted);

    expect(parsed.v).toBe(1);
    expect(typeof parsed.iv).toBe('string');
    expect(typeof parsed.tag).toBe('string');
    expect(typeof parsed.data).toBe('string');
  });

  it('handles special characters in credentials', () => {
    const specialCreds = {
      username: 'user@example.com',
      password: 'p@$$w0rd!#$%^&*(){}[]|\\:";\'<>,.?/',
    };
    const encrypted = encryptCredentials(specialCreds, testKey);
    const decrypted = decryptCredentials(encrypted, testKey);

    expect(decrypted).toEqual(specialCreds);
  });

  it('handles unicode in credentials', () => {
    const unicodeCreds = {
      username: '用户名',
      password: 'пароль🔐',
    };
    const encrypted = encryptCredentials(unicodeCreds, testKey);
    const decrypted = decryptCredentials(encrypted, testKey);

    expect(decrypted).toEqual(unicodeCreds);
  });

  it('handles empty strings', () => {
    const emptyCreds = { username: '', password: '' };
    const encrypted = encryptCredentials(emptyCreds, testKey);
    const decrypted = decryptCredentials(encrypted, testKey);

    expect(decrypted).toEqual(emptyCreds);
  });

  it('fails with wrong key', () => {
    const encrypted = encryptCredentials(testCredentials, testKey);
    const wrongKey = generateKey();

    expect(() => decryptCredentials(encrypted, wrongKey)).toThrow('invalid key or corrupted data');
  });

  it('fails with tampered ciphertext', () => {
    const encrypted = encryptCredentials(testCredentials, testKey);
    const parsed = JSON.parse(encrypted);

    // Tamper with the data
    const tamperedData = Buffer.from(parsed.data, 'base64');
    tamperedData[0] ^= 0xff; // Flip bits
    parsed.data = tamperedData.toString('base64');

    const tampered = JSON.stringify(parsed);
    expect(() => decryptCredentials(tampered, testKey)).toThrow('invalid key or corrupted data');
  });

  it('fails with tampered auth tag', () => {
    const encrypted = encryptCredentials(testCredentials, testKey);
    const parsed = JSON.parse(encrypted);

    // Tamper with the tag
    const tamperedTag = Buffer.from(parsed.tag, 'base64');
    tamperedTag[0] ^= 0xff;
    parsed.tag = tamperedTag.toString('base64');

    const tampered = JSON.stringify(parsed);
    expect(() => decryptCredentials(tampered, testKey)).toThrow('invalid key or corrupted data');
  });

  it('fails with invalid JSON', () => {
    expect(() => decryptCredentials('not json', testKey)).toThrow('not valid JSON');
  });

  it('fails with unsupported version', () => {
    const encrypted = encryptCredentials(testCredentials, testKey);
    const parsed = JSON.parse(encrypted);
    parsed.v = 99;

    expect(() => decryptCredentials(JSON.stringify(parsed), testKey)).toThrow('Unsupported encryption version');
  });
});

describe('rotateCredentials', () => {
  it('re-encrypts with new key', () => {
    const oldKey = generateKey();
    const newKey = generateKey();
    const credentials = { username: 'admin', password: 'secret' };

    // Encrypt with old key
    const encryptedOld = encryptCredentials(credentials, oldKey);

    // Rotate to new key
    const encryptedNew = rotateCredentials(encryptedOld, oldKey, newKey);

    // Should not decrypt with old key
    expect(() => decryptCredentials(encryptedNew, oldKey)).toThrow();

    // Should decrypt with new key
    const decrypted = decryptCredentials(encryptedNew, newKey);
    expect(decrypted).toEqual(credentials);
  });

  it('fails if old key is wrong', () => {
    const realOldKey = generateKey();
    const wrongOldKey = generateKey();
    const newKey = generateKey();
    const credentials = { username: 'admin', password: 'secret' };

    const encrypted = encryptCredentials(credentials, realOldKey);

    expect(() => rotateCredentials(encrypted, wrongOldKey, newKey)).toThrow();
  });
});
