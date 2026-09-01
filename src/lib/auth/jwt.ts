import { SignJWT, jwtVerify } from 'jose';
import { SessionUser } from '@/types';

const secretKey = process.env.JWT_SECRET || 'hospital_management_system_super_secret_jwt_key_2026_production';
const key = new TextEncoder().encode(secretKey);

export async function signJWT(payload: SessionUser, expiresIn: string = '7d'): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifyJWT(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionUser;
  } catch (error) {
    return null;
  }
}
