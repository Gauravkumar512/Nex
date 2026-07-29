import { Router } from 'express';
import { Profile } from 'passport-google-oauth20';
import client from '../config/db';
import passport from '../config/passport';
import { AuthenticatedRequest, verifyAccessToken, verifyRefreshToken } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter';
import { generateTokens, googleAuth } from '../services/auth.service';

const router = Router();

interface GoogleAuthPayload {
  profile: Profile;
  accessToken: string;
  refreshToken: string;
}

const isProd = process.env.NODE_ENV === 'production';
const authCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge,
});

router.get(
  '/google',
  authLimiter,
  passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent',
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/auth/failure',
  }),
  async (req, res, next) => {
    try {
      const data = req.user as GoogleAuthPayload;

      const user = await googleAuth(data);
      const { accessToken, refreshToken } = generateTokens(user.id);

      res.cookie('accessToken', accessToken, authCookieOptions(15 * 60 * 1000));
      res.cookie('refreshToken', refreshToken, authCookieOptions(7 * 24 * 60 * 60 * 1000));

      const frontendUrl = process.env.FRONTEND_URL;
      if (!frontendUrl) throw new Error('FRONTEND_URL is not set');
      res.redirect(`${frontendUrl}/dashboard`);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/failure', (req, res) => {
  res.status(401).json({ message: 'Google authentication failed' });
});

router.get('/logout', (_req, res) => {
  res.clearCookie('accessToken', authCookieOptions(0));
  res.clearCookie('refreshToken', authCookieOptions(0));
  res.redirect(process.env.FRONTEND_URL ?? 'http://localhost:5173');
});

router.post('/refresh', authLimiter, (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ message: 'No refresh token provided' });
    return;
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const tokens = generateTokens(decoded.userId);

    res.cookie('accessToken', tokens.accessToken, authCookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', tokens.refreshToken, authCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(200).json({ message: 'Tokens refreshed' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

router.get('/me', verifyAccessToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await client.user.findUnique({
      where: { id: req.userId as string },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
