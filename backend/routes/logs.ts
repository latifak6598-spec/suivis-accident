import express from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin, AuthRequest, getClientIp } from '../middleware/auth.js';
import { logSchema } from '../utils/validation.js';
import { logActivity } from '../services/audit.service.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', requireAdmin, (_req, res) => {
  const logs = db
    .prepare(`
      SELECT activity_log.id, activity_log.action, activity_log.details,
             activity_log.ip, activity_log.timestamp,
             users.firstName, users.lastName, users.username
      FROM activity_log
      LEFT JOIN users ON activity_log.userId = users.id
      ORDER BY timestamp DESC
      LIMIT 500
    `)
    .all();
  res.json(logs);
});

router.post('/', (req: AuthRequest, res) => {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid log entry' });

  logActivity(req.user!.id, parsed.data.action, parsed.data.details, getClientIp(req));
  res.json({ success: true });
});

export default router;
