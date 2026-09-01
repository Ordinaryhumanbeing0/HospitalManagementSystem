import { cookies } from 'next/headers';
import { signJWT, verifyJWT } from './jwt';
import { SessionUser } from '@/types';

export const AUTH_COOKIE_NAME = 'hms_auth_token';

export async function createSessionCookie(user: SessionUser) {
  const token = await signJWT(user);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;
  return await verifyJWT(token);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
