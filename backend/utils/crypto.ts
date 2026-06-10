import crypto from 'crypto';
import fs from 'fs';
import { KEY_PATH } from './paths.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

let cachedKey: Buffer | null = null;

function loadOrCreateMasterKey(): Buffer {
  if (cachedKey) return cachedKey;

  const envKey = process.env.APP_ENCRYPTION_KEY;
  if (envKey) {
    const buf = Buffer.from(envKey, 'hex');
    if (buf.length !== KEY_LENGTH) {
      throw new Error('APP_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    cachedKey = buf;
    return buf;
  }

  if (fs.existsSync(KEY_PATH)) {
    const hex = fs.readFileSync(KEY_PATH, 'utf8').trim();
    cachedKey = Buffer.from(hex, 'hex');
    return cachedKey;
  }

  const key = crypto.randomBytes(KEY_LENGTH);
  fs.writeFileSync(KEY_PATH, key.toString('hex'), { mode: 0o600 });
  console.log('🔐 Generated persistent encryption key at backend/data/.app-key');
  cachedKey = key;
  return key;
}

export function getMasterKey(): Buffer {
  return loadOrCreateMasterKey();
}

export function encryptBuffer(plaintext: Buffer): Buffer {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptBuffer(payload: Buffer): Buffer {
  const key = getMasterKey();
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function encryptString(plaintext: string): string {
  return encryptBuffer(Buffer.from(plaintext, 'utf8')).toString('base64');
}

export function decryptString(ciphertext: string): string {
  return decryptBuffer(Buffer.from(ciphertext, 'base64')).toString('utf8');
}

/** Derive a backup-specific key from master key + salt (for portable encrypted backups). */
export function deriveBackupKey(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, KEY_LENGTH);
}

export function encryptWithPassword(plaintext: Buffer, password: string): Buffer {
  const salt = crypto.randomBytes(16);
  const key = deriveBackupKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from('SABK1'), salt, iv, tag, encrypted]);
}

export function decryptWithPassword(payload: Buffer, password: string): Buffer {
  const header = payload.subarray(0, 5).toString('utf8');
  if (header !== 'SABK1') throw new Error('Invalid backup format');
  const salt = payload.subarray(5, 21);
  const iv = payload.subarray(21, 21 + IV_LENGTH);
  const tag = payload.subarray(21 + IV_LENGTH, 21 + IV_LENGTH + TAG_LENGTH);
  const encrypted = payload.subarray(21 + IV_LENGTH + TAG_LENGTH);
  const key = deriveBackupKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateTempPassword(): string {
  return crypto.randomBytes(9).toString('base64url');
}
