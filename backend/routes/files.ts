import express from 'express';
import multer from 'multer';
import { requireAuth, requireAdmin, AuthRequest, getClientIp } from '../middleware/auth.js';
import { requireAppNotExpired } from '../middleware/expiry.js';
import {
  ALLOWED_DOC_KEYS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  fileDeleteSchema,
} from '../utils/validation.js';
import {
  deleteDocument,
  getDocumentForDownload,
  getDocumentMeta,
  uploadDocument,
} from '../services/file.service.js';
import { logActivity } from '../services/audit.service.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

router.use(requireAuth, requireAppNotExpired);

router.post('/upload', upload.single('file'), (req: AuthRequest, res) => {
  const file = req.file;
  const { vehicleCode, docKey, accidentId } = req.body;

  if (!file || !vehicleCode || !docKey) {
    return res.status(400).json({ error: 'Missing file, vehicleCode, or docKey' });
  }

  if (!ALLOWED_DOC_KEYS.includes(docKey)) {
    return res.status(400).json({ error: 'Invalid docKey' });
  }

  try {
    const result = uploadDocument(
      vehicleCode,
      docKey,
      accidentId ? Number(accidentId) : undefined,
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      }
    );
    logActivity(
      req.user!.id,
      'Upload document',
      `${vehicleCode}/${docKey}`,
      getClientIp(req)
    );
    res.json({ success: true, fileId: result.id, fileName: result.fileName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    res.status(400).json({ error: msg });
  }
});

router.get('/:id/meta', (req: AuthRequest, res) => {
  const fileId = Number(req.params.id);
  if (!Number.isInteger(fileId)) return res.status(400).json({ error: 'Invalid file id' });

  const meta = getDocumentMeta(fileId);
  if (!meta) return res.status(404).json({ error: 'File not found' });
  res.json(meta);
});

router.get('/:id/download', (req: AuthRequest, res) => {
  const fileId = Number(req.params.id);
  if (!Number.isInteger(fileId)) return res.status(400).json({ error: 'Invalid file id' });

  const doc = getDocumentForDownload(fileId);
  if (!doc) return res.status(404).json({ error: 'File not found' });

  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
  res.send(doc.buffer);
});

router.delete('/', requireAdmin, (req: AuthRequest, res) => {
  const parsed = fileDeleteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid delete request' });

  try {
    deleteDocument(
      parsed.data.vehicleCode,
      parsed.data.docKey,
      parsed.data.accidentId
    );
    logActivity(
      req.user!.id,
      'Suppression document',
      `${parsed.data.vehicleCode}/${parsed.data.docKey}`,
      getClientIp(req)
    );
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Delete failed' });
  }
});

export default router;
