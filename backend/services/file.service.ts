import fs from 'fs';
import path from 'path';
import db from '../db.js';
import { UPLOADS_DIR } from '../utils/paths.js';
import { decryptBuffer, encryptBuffer } from '../utils/crypto.js';
import { ALLOWED_DOC_KEYS } from '../utils/validation.js';
import { getOrCreateCurrentAccident } from './accident.service.js';
import { buildDocumentFileName, buildStoredRelativePath } from '../utils/filename.js';

function safeStoredPath(storedName: string): string {
  const normalized = path.normalize(storedName).replace(/^(\.\.(\/|\\|$))+/, '');
  const resolved = path.resolve(UPLOADS_DIR, normalized);
  if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
    throw new Error('Invalid path');
  }
  return resolved;
}

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function deletePhysicalFile(storedName: string): void {
  const filePath = safeStoredPath(storedName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function deleteDocumentsForAccident(accidentId: number): void {
  const docs = db
    .prepare('SELECT storedName FROM documents WHERE accidentId = ?')
    .all(accidentId) as Array<{ storedName: string }>;

  for (const doc of docs) {
    deletePhysicalFile(doc.storedName);
  }
  db.prepare('DELETE FROM documents WHERE accidentId = ?').run(accidentId);
}

export function saveEncryptedFile(buffer: Buffer, storedName: string): void {
  const filePath = safeStoredPath(storedName);
  ensureParentDir(filePath);
  const encrypted = encryptBuffer(buffer);
  fs.writeFileSync(filePath, encrypted);
}

export function readEncryptedFile(storedName: string): Buffer {
  const encrypted = fs.readFileSync(safeStoredPath(storedName));
  return decryptBuffer(encrypted);
}

function countSiblingDocuments(
  vehicleCode: string,
  docKey: string,
  excludeAccidentId: number
): number {
  const row = db
    .prepare(`
      SELECT COUNT(*) as c FROM documents d
      JOIN accidents a ON d.accidentId = a.id
      WHERE a.vehicleCode = ? AND d.docKey = ? AND d.accidentId != ?
    `)
    .get(vehicleCode, docKey, excludeAccidentId) as { c: number };
  return row.c;
}

export function uploadDocument(
  vehicleCode: string,
  docKey: string,
  accidentId: number | undefined,
  file: { originalname: string; mimetype: string; size: number; buffer: Buffer }
): { id: number; fileName: string } {
  if (!ALLOWED_DOC_KEYS.includes(docKey as (typeof ALLOWED_DOC_KEYS)[number])) {
    throw new Error('INVALID_DOC_KEY');
  }

  const targetAccidentId = accidentId ?? getOrCreateCurrentAccident(vehicleCode);

  const acc = db.prepare('SELECT id, vehicleCode, isCurrent FROM accidents WHERE id = ?').get(
    targetAccidentId
  ) as { id: number; vehicleCode: string; isCurrent: number } | undefined;

  if (!acc || acc.vehicleCode !== vehicleCode) {
    throw new Error('INVALID_ACCIDENT');
  }

  const existing = db
    .prepare('SELECT id, storedName FROM documents WHERE accidentId = ? AND docKey = ?')
    .get(targetAccidentId, docKey) as { id: number; storedName: string } | undefined;

  const siblingCount = countSiblingDocuments(vehicleCode, docKey, targetAccidentId);
  const displayName = buildDocumentFileName(
    vehicleCode,
    docKey,
    file.mimetype,
    file.originalname,
    siblingCount
  );
  const storedName = buildStoredRelativePath(
    vehicleCode,
    targetAccidentId,
    docKey,
    displayName
  );

  saveEncryptedFile(file.buffer, storedName);

  if (existing) {
    deletePhysicalFile(existing.storedName);
    db.prepare(`
      UPDATE documents SET fileName = ?, storedName = ?, mimeType = ?, size = ?, uploadedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(displayName, storedName, file.mimetype, file.size, existing.id);
    return { id: existing.id, fileName: displayName };
  }

  const info = db
    .prepare(`
      INSERT INTO documents (accidentId, docKey, fileName, storedName, mimeType, size)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(targetAccidentId, docKey, displayName, storedName, file.mimetype, file.size);

  return { id: Number(info.lastInsertRowid), fileName: displayName };
}

export function getDocumentMeta(fileId: number): {
  fileName: string;
  mimeType: string;
  size: number;
  vehicleCode: string;
  docKey: string;
} | null {
  const doc = db
    .prepare(`
      SELECT documents.fileName, documents.mimeType, documents.size, documents.docKey, accidents.vehicleCode
      FROM documents
      JOIN accidents ON documents.accidentId = accidents.id
      WHERE documents.id = ?
    `)
    .get(fileId) as
    | {
        fileName: string;
        mimeType: string;
        size: number;
        docKey: string;
        vehicleCode: string;
      }
    | undefined;

  return doc ?? null;
}

export function getDocumentForDownload(
  fileId: number
): { buffer: Buffer; fileName: string; mimeType: string } | null {
  const doc = db
    .prepare(`
      SELECT documents.storedName, documents.fileName, documents.mimeType
      FROM documents
      WHERE documents.id = ?
    `)
    .get(fileId) as
    | {
        storedName: string;
        fileName: string;
        mimeType: string;
      }
    | undefined;

  if (!doc) return null;

  const buffer = readEncryptedFile(doc.storedName);
  return { buffer, fileName: doc.fileName, mimeType: doc.mimeType };
}

export function deleteDocument(
  vehicleCode: string,
  docKey: string,
  accidentId?: number
): void {
  let targetId = accidentId;
  if (!targetId) {
    const current = db
      .prepare('SELECT id FROM accidents WHERE vehicleCode = ? AND isCurrent = 1')
      .get(vehicleCode) as { id: number } | undefined;
    if (!current) return;
    targetId = current.id;
  }

  const existing = db
    .prepare('SELECT storedName FROM documents WHERE accidentId = ? AND docKey = ?')
    .get(targetId, docKey) as { storedName: string } | undefined;

  if (existing) {
    deletePhysicalFile(existing.storedName);
    db.prepare('DELETE FROM documents WHERE accidentId = ? AND docKey = ?').run(targetId, docKey);
  }
}
