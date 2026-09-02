import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  LEGACY_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  JwtPayload,
  signTokenPair,
  verifyAccessToken,
} from '@/lib/jwt';

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

export function getAccessToken(request: NextRequest) {
  return request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? request.cookies.get(LEGACY_TOKEN_COOKIE)?.value;
}

export function getAccessPayload(request: NextRequest): JwtPayload | null {
  const token = getAccessToken(request);
  return token ? verifyAccessToken(token) : null;
}

export function setAuthCookies(response: NextResponse, payload: JwtPayload) {
  const { accessToken, refreshToken } = signTokenPair(payload);
  setAuthCookieValues(response, accessToken, refreshToken);

  return { accessToken, refreshToken };
}

export function setAuthCookieValues(response: NextResponse, accessToken: string, refreshToken: string) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60,
  });
  response.cookies.set(LEGACY_TOKEN_COOKIE, '', { maxAge: 0, path: '/' });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', { maxAge: 0, path: '/' });
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', { maxAge: 0, path: '/' });
  response.cookies.set(LEGACY_TOKEN_COOKIE, '', { maxAge: 0, path: '/' });
}
