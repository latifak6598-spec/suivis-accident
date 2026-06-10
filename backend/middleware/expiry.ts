import { Response, NextFunction } from 'express';
import { isAppExpired } from '../services/settings.service.js';
import { AuthRequest } from './auth.js';

/** Block non-admin users when app licence has expired. */
export function requireAppNotExpired(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.role === 'admin') {
    return next();
  }
  if (isAppExpired()) {
    return res.status(403).json({ error: 'expired' });
  }
  next();
}
