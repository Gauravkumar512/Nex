import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function verifyAccessToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken;

  if (!token) {
    res.status(401).json({ message: 'No access token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Access token expired' });
      return;
    }
    res.status(401).json({ message: 'Invalid access token' });
  }
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };
}
