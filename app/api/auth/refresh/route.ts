import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { setAuthCookieValues } from '@/lib/auth-cookies';
import { REFRESH_TOKEN_COOKIE, signTokenPair, verifyRefreshToken } from '@/lib/jwt';

/**
 * Accepts the refresh token from either transport:
 *   - JSON body { refreshToken }  — token-based clients (vendor RN app)
 *   - refresh_token cookie        — the web client (lib/auth-fetch.ts sends a
 *     bodyless POST and relies on the httpOnly cookie)
 *
 * The body is read as text because a bodyless POST makes request.json() throw.
 */
async function readRefreshTokenFromBody(request: NextRequest): Promise<string | null> {
  try {
    const text = await request.text();
    if (!text) return null;
    const parsed = JSON.parse(text) as { refreshToken?: unknown } | null;
    const value = parsed && typeof parsed === 'object' ? parsed.refreshToken : undefined;
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const bodyRefreshToken = await readRefreshTokenFromBody(request);
    const refreshToken =
      bodyRefreshToken ?? request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token missing' }, { status: 401 });
    }

    // Signature, expiry and tokenType === 'refresh' are all enforced here.
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    const user = await prisma.profile.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }
    // A deactivated account must not be able to mint new access tokens.
    if (user.isActive === false) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }

    const tokens = signTokenPair({ id: user.id, email: user.email, role: user.role });
    // Both tokens in the body so token-based clients never need Set-Cookie.
    const response = NextResponse.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    setAuthCookieValues(response, tokens.accessToken, tokens.refreshToken);

    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}
