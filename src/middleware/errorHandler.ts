import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  res.status(500).json({
    message:
      process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
}
