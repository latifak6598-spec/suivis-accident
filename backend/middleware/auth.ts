import { Request, Response, NextFunction } from 'express';
import { resolveSession, SessionUser } from '../services/auth.service.js';

export interface AuthRequest extends Request {
  user?: SessionUser;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.session_token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = resolveSession(token);
  if (!user) {
    res.clearCookie('session_token', { path: '/api' });
    return res.status(401).json({ error: 'Invalid session' });
  }

  if (user.status !== 'approved') {
    return res.status(403).json({ error: user.status });
  }

  req.user = user;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  }
  next();
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? '';
}
