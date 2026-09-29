/**
 * Contract test for POST /api/auth/refresh — the endpoint the vendor mobile app
 * uses for token-based (cookie-free) authentication.
 *
 * Drives the real route handler, so it checks the actual transport precedence,
 * status codes and response shape rather than a reimplementation.
 *
 *   npx dotenv -e .env.development -- npx tsx scripts/test-refresh-token-contract.ts
 *
 * DB safety: reads only, except one throwaway profile tagged TESTREFRESH that
 * is deleted in a finally block. No tokens are ever printed.
 */

import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { POST } from '@/app/api/auth/refresh/route';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  signRefreshToken,
  signAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '@/lib/jwt';

const TAG = 'TESTREFRESH';
const ENDPOINT = 'http://localhost/api/auth/refresh';

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Never log a token; only its shape is interesting. */
function looksLikeJwt(token: unknown): boolean {
  return typeof token === 'string' && token.split('.').length === 3;
}

type Body = { refreshToken?: string } | undefined;

function request(headers: Record<string, string>, body?: Body): NextRequest {
  return new NextRequest(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function expiredRefreshToken(userId: string, email: string, role: string): Promise<string> {
  // Same secret and tokenType as signRefreshToken, but already in the past.
  const secret =
    process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET || 'sajjan-mart-dev-secret'}-refresh`;
  return jwt.sign({ id: userId, email, role, tokenType: 'refresh' }, secret, { expiresIn: '-30s' });
}

async function main() {
  const user = await prisma.profile.findFirst({
    where: { isActive: true, role: 'admin' },
    select: { id: true, email: true, role: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!user) throw new Error('No active admin profile to mint tokens for');
  console.log(`subject: existing active profile (role=${user.role})`);

  // Throwaway deactivated account, removed in finally.
  const deactivated = await prisma.profile.create({
    data: {
      email: `${TAG}_${Date.now()}@example.invalid`,
      fullName: `${TAG} deactivated`,
      role: 'staff',
      isActive: false,
    },
    select: { id: true, email: true, role: true },
  });

  const validRefresh = signRefreshToken(user);

  console.log('\n1) JSON body transport (vendor mobile app)');
  {
    const res = await POST(request({}, { refreshToken: validRefresh }));
    const json = await res.json();
    check('body-only request returns 200', res.status === 200, `got ${res.status}`);
    check('success flag is true', json.success === true);
    check('accessToken is present in the JSON body', looksLikeJwt(json.accessToken));
    check('refreshToken is rotated and present in the JSON body', looksLikeJwt(json.refreshToken));
    check(
      'returned access token verifies and is typed access',
      Boolean(json.accessToken && verifyAccessToken(json.accessToken)),
    );
    check(
      'returned refresh token verifies and is typed refresh',
      Boolean(json.refreshToken && verifyRefreshToken(json.refreshToken)),
    );
    check(
      'rotated pair carries the same subject',
      Boolean(json.accessToken && verifyAccessToken(json.accessToken)?.id === user.id),
    );
  }

  console.log('\n2) Cookie transport with a bodyless POST (web client compatibility)');
  {
    const cookieRequest = new NextRequest(ENDPOINT, {
      method: 'POST',
      headers: { cookie: `${REFRESH_TOKEN_COOKIE}=${validRefresh}` },
    });
    const cookieRes = await POST(cookieRequest);
    const cookieJson = await cookieRes.json();
    check('cookie-only request still returns 200', cookieRes.status === 200, `got ${cookieRes.status}`);
    check(
      'cookie-only response includes both tokens',
      looksLikeJwt(cookieJson.accessToken) && looksLikeJwt(cookieJson.refreshToken),
    );
  }

  console.log('\n3) Body takes precedence over the cookie jar');
  {
    const res = await POST(
      request(
        { cookie: `${REFRESH_TOKEN_COOKIE}=not-a-token` },
        { refreshToken: validRefresh },
      ),
    );
    check('valid body beats a garbage cookie', res.status === 200, `got ${res.status}`);
  }

  console.log('\n4) Rejections');
  {
    const missing = await POST(request({}, {}));
    check('no body token and no cookie -> 401', missing.status === 401, `got ${missing.status}`);

    const malformed = await POST(
      new NextRequest(ENDPOINT, { method: 'POST', body: 'not json at all' }),
    );
    check('malformed body falls back to the cookie and 401s', malformed.status === 401, `got ${malformed.status}`);

    const garbage = await POST(request({}, { refreshToken: 'garbage' }));
    check('unsigned token -> 401', garbage.status === 401, `got ${garbage.status}`);

    const wrongType = await POST(request({}, { refreshToken: signAccessToken(user) }));
    check('access token presented as refresh -> 401', wrongType.status === 401, `got ${wrongType.status}`);

    const otherSecret = jwt.sign({ ...user, tokenType: 'refresh' }, 'a-completely-different-secret', {
      expiresIn: '1m',
    });
    const forged = await POST(request({}, { refreshToken: otherSecret }));
    check('token signed with another secret -> 401', forged.status === 401, `got ${forged.status}`);

    const expired = await expiredRefreshToken(user.id, user.email, user.role);
    const expiredRes = await POST(request({}, { refreshToken: expired }));
    check('expired refresh token -> 401', expiredRes.status === 401, `got ${expiredRes.status}`);

    const gone = signRefreshToken({ id: 'does-not-exist', email: 'gone@example.invalid', role: 'staff' });
    const goneRes = await POST(request({}, { refreshToken: gone }));
    check('deleted user -> 401', goneRes.status === 401, `got ${goneRes.status}`);

    const deactivatedRes = await POST(
      request({}, { refreshToken: signRefreshToken(deactivated) }),
    );
    check(
      'deactivated account -> 403 (session cannot be renewed)',
      deactivatedRes.status === 403,
      `got ${deactivatedRes.status}`,
    );
  }

  console.log('\n5) Web clients still get cookies');
  {
    const res = await POST(request({}, { refreshToken: validRefresh }));
    const setCookie = res.headers.get('set-cookie') ?? '';
    check(
      'the rotated pair is also offered as httpOnly cookies',
      setCookie.includes(`${ACCESS_TOKEN_COOKIE}=`) &&
        setCookie.includes(`${REFRESH_TOKEN_COOKIE}=`) &&
        /httponly/i.test(setCookie),
      setCookie ? 'unexpected cookie header' : 'no set-cookie header',
    );
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('CONTRACT TEST ERROR:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    const purged = await prisma.profile.deleteMany({
      where: { email: { startsWith: TAG } },
    });
    console.log(`cleanup: deleted ${purged.count} throwaway profile(s)`);
    await prisma.$disconnect();
  });
