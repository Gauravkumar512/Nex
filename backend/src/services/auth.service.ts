import { Profile } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import client from '../config/db';
import { encrypt } from '../utils/encryption';

interface GoogleAuthResult {
  profile: Profile;
  accessToken: string;
  refreshToken: string;
}

export async function googleAuth(data: GoogleAuthResult) {
  const { profile, accessToken, refreshToken } = data;

  const email = profile.emails?.[0]?.value;
  const name = profile.displayName;
  const avatarUrl = profile.photos?.[0]?.value ?? null;
  const googleId = profile.id;

  if (!email) {
    throw new Error('No email returned from Google profile');
  }

  // accessToken kept for future Gmail API automation (inbox watching, reply detection).
  const user = await client.user.upsert({
    where: { googleId },
    update: {
      accessToken,
      accessTokenExpiry: new Date(Date.now() + 3600 * 1000),
      ...(avatarUrl && { avatarUrl }),
      ...(refreshToken && { encryptedRefreshToken: encrypt(refreshToken) }),
    },
    create: {
      email,
      name,
      googleId,
      avatarUrl,
      accessToken,
      accessTokenExpiry: new Date(Date.now() + 3600 * 1000),
      encryptedRefreshToken: refreshToken ? encrypt(refreshToken) : null,
    },
    select: { id: true },
  });

  return user;
}

export function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
}
