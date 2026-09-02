import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { setAuthCookieValues } from '@/lib/auth-cookies';
import { REFRESH_TOKEN_COOKIE, signTokenPair, verifyRefreshToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token missing' }, { status: 401 });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    const user = await prisma.profile.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const tokens = signTokenPair({ id: user.id, email: user.email, role: user.role });
    const response = NextResponse.json({ success: true, accessToken: tokens.accessToken });
    setAuthCookieValues(response, tokens.accessToken, tokens.refreshToken);

    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}
