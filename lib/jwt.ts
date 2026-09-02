import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'sajjan-mart-dev-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${SECRET}-refresh`;

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const LEGACY_TOKEN_COOKIE = 'token';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, tokenType: 'access' }, SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, tokenType: 'refresh' }, REFRESH_SECRET, { expiresIn: '30d' });
}

export function signTokenPair(payload: JwtPayload) {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export function signToken(payload: JwtPayload): string {
  return signAccessToken(payload);
}

export function verifyToken(token: string): JwtPayload | null {
  return verifyAccessToken(token);
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, SECRET) as JwtPayload & { tokenType?: string };
    if (payload.tokenType && payload.tokenType !== 'access') return null;
    return { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET) as JwtPayload & { tokenType?: string };
    if (payload.tokenType !== 'refresh') return null;
    return { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
