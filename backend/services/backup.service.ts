import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import db from '../db.js';
import { BACKUPS_DIR, DB_PATH, UPLOADS_DIR } from '../utils/paths.js';
import { decryptWithPassword, encryptWithPassword } from '../utils/crypto.js';

export function listBackups(): Array<{ name: string; size: number; createdAt: string }> {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  return fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.sabak'))
    .map((name) => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, name));
      return { name, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function collectAllUploadFiles(): Array<{ storedName: string; data: string }> {
  const files: Array<{ storedName: string; data: string }> = [];
  const docs = db.prepare('SELECT storedName FROM documents').all() as Array<{ storedName: string }>;

  for (const doc of docs) {
    const filePath = safeStoredPath(doc.storedName);
    if (fs.existsSync(filePath)) {
      files.push({
        storedName: doc.storedName.replace(/\\/g, '/'),
        data: fs.readFileSync(filePath).toString('base64'),
      });
    }
  }
  return files;
}

function safeStoredPath(storedName: string): string {
  const normalized = path.normalize(storedName).replace(/^(\.\.(\/|\\|$))+/, '');
  const resolved = path.resolve(UPLOADS_DIR, normalized);
  if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
    throw new Error('Invalid path');
  }
  return resolved;
}

function clearUploadsDirectory(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    return;
  }
  for (const entry of fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })) {
    const full = path.join(UPLOADS_DIR, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      fs.unlinkSync(full);
    }
  }
}

function restoreUploadFiles(files: Array<{ storedName: string; data: string }>): void {
  clearUploadsDirectory();
  for (const f of files) {
    const dest = safeStoredPath(f.storedName);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(f.data, 'base64'));
  }
}

export function createEncryptedBackup(password: string): { filename: string; path: string } {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${timestamp}.sabak`;
  const outPath = path.join(BACKUPS_DIR, filename);

  db.pragma('wal_checkpoint(TRUNCATE)');

  const bundle = {
    version: 2,
    createdAt: new Date().toISOString(),
    database: fs.readFileSync(DB_PATH).toString('base64'),
    files: collectAllUploadFiles(),
  };

  const plaintext = Buffer.from(JSON.stringify(bundle), 'utf8');
  const encrypted = encryptWithPassword(plaintext, password);
  fs.writeFileSync(outPath, encrypted);

  return { filename, path: outPath };
}

export function readBackupFile(filename: string): Buffer {
  const safe = path.basename(filename);
  const filePath = path.join(BACKUPS_DIR, safe);
  if (!path.resolve(filePath).startsWith(path.resolve(BACKUPS_DIR))) {
    throw new Error('Invalid backup path');
  }
  if (!fs.existsSync(filePath)) throw new Error('BACKUP_NOT_FOUND');
  return fs.readFileSync(filePath);
}

export function deleteBackup(filename: string): void {
  const safe = path.basename(filename);
  const filePath = path.join(BACKUPS_DIR, safe);
  if (!path.resolve(filePath).startsWith(path.resolve(BACKUPS_DIR))) {
    throw new Error('Invalid backup path');
  }
  if (!fs.existsSync(filePath)) throw new Error('BACKUP_NOT_FOUND');
  fs.unlinkSync(filePath);
}

export function restoreFromEncryptedBackup(filename: string, password: string): void {
  const encrypted = readBackupFile(filename);
  const plaintext = decryptWithPassword(encrypted, password);
  const bundle = JSON.parse(plaintext.toString('utf8')) as {
    version: number;
    database: string;
    files?: Array<{ storedName: string; data: string }>;
    manifest?: { files: Array<{ storedName: string; data: string }> };
  };

  const fileList = bundle.files ?? bundle.manifest?.files ?? [];
  const tempPath = path.join(BACKUPS_DIR, `_restore_${Date.now()}.db`);

  try {
    fs.writeFileSync(tempPath, Buffer.from(bundle.database, 'base64'));
    const sourceDb = new Database(tempPath, { readonly: true });
    sourceDb.backup(db);
    sourceDb.close();

    restoreUploadFiles(fileList);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

export function getDatabaseSnapshot(): Buffer {
  db.pragma('wal_checkpoint(TRUNCATE)');
  return fs.readFileSync(DB_PATH);
}
