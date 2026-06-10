import path from 'path';
import { getDocLabel } from './docLabels.js';

export function sanitizeFileSegment(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export function extensionFromMime(mimeType: string, originalName: string): string {
  const fromOriginal = path.extname(originalName);
  if (fromOriginal && fromOriginal.length <= 10) return fromOriginal.toLowerCase();

  const map: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  };
  return map[mimeType] ?? '.bin';
}

/** Build display name: "PV d'expertise - 0001234.pdf" or "... (2).pdf" when duplicates exist. */
export function buildDocumentFileName(
  vehicleCode: string,
  docKey: string,
  mimeType: string,
  originalName: string,
  siblingCount: number
): string {
  const label = getDocLabel(docKey);
  const ext = extensionFromMime(mimeType, originalName);
  const base = sanitizeFileSegment(`${label} - ${vehicleCode}`);
  const suffix = siblingCount > 0 ? ` (${siblingCount + 1})` : '';
  return `${base}${suffix}${ext}`;
}

export function buildStoredRelativePath(
  vehicleCode: string,
  accidentId: number,
  docKey: string,
  fileName: string
): string {
  const safeCode = sanitizeFileSegment(vehicleCode).replace(/\s/g, '_');
  const safeKey = sanitizeFileSegment(docKey);
  const safeName = sanitizeFileSegment(path.basename(fileName, path.extname(fileName)));
  const ext = path.extname(fileName) || '.enc';
  return path.join(safeCode, String(accidentId), safeKey, `${safeName}${ext}.enc`);
}
