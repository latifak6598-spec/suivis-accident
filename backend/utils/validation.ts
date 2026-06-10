import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  password: z.string().min(8).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export const statusSchema = z.object({
  status: z.enum(['approved', 'pending', 'blocked']),
});

export const accidentCurrentSchema = z.object({
  dateAccident: z.string().max(32).optional().nullable(),
  raisonDegat: z.string().max(2000).optional().nullable(),
  note: z.string().max(5000).optional().nullable(),
});

export const archiveUpdateSchema = accidentCurrentSchema;

export const logSchema = z.object({
  action: z.string().min(1).max(200),
  details: z.string().max(5000).optional().default(''),
});

export const fileDeleteSchema = z.object({
  vehicleCode: z.string().min(1).max(50),
  docKey: z.string().min(1).max(80),
  accidentId: z.coerce.number().int().positive().optional(),
});

export const expirySchema = z.object({
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const resetDbSchema = z.object({
  adminPassword: z.string().min(1).max(200),
});

export const ALLOWED_DOC_KEYS = [
  'accidentReport',
  'accidentPhoto',
  'accidentDocs',
  'caarCashReport',
  'expertiseReport',
  'workRequest',
] as const;

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export function normalizeUsername(lastName: string, firstName: string): string {
  const normalizedLastName = lastName.trim().toUpperCase();
  const normalizedFirstName =
    firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1).toLowerCase();
  return `${normalizedLastName} ${normalizedFirstName}`;
}
