import express from 'express';
import { requireAuth, AuthRequest, getClientIp } from '../middleware/auth.js';
import { getDatabaseSnapshot } from '../services/backup.service.js';
import { logActivity } from '../services/audit.service.js';

const router = express.Router();

router.get('/database', requireAuth, (req: AuthRequest, res) => {
  try {
    const snapshot = getDatabaseSnapshot();
    const dateStr = new Date().toISOString().split('T')[0];
    logActivity(req.user!.id, 'Export base SQLite', dateStr, getClientIp(req));
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="suivi_accidents_${dateStr}.db"`
    );
    res.send(snapshot);
  } catch {
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
