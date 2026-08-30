import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { parseBody } from '@/lib/api-utils';
import { getAccessPayload } from '@/lib/auth-cookies';

/**
 * POST /api/notifications/register-device
 *
 * Register or re-activate an FCM device token for the authenticated user.
 *
 * Expects an authenticated request (JWT in cookie).
 * Body: { fcmToken: string, platform?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate via JWT cookie — user ID comes from the token, not the body.
    const payload = getAccessPayload(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fcmToken, platform } = await parseBody(request);

    if (!fcmToken || typeof fcmToken !== 'string') {
      return NextResponse.json(
        { error: 'fcmToken is required' },
        { status: 400 },
      );
    }

    // Upsert: if the token already exists just re-activate it.
    const record = await prisma.deviceToken.upsert({
      where: { token: fcmToken },
      create: {
        userId: payload.id,
        token: fcmToken,
        platform: platform || 'android',
        isActive: true,
      },
      update: {
        isActive: true,
        platform: platform || 'android',
      },
    });

    return NextResponse.json({ id: record.id, success: true });
  } catch (error) {
    console.error('[notifications] register-device failed:', error);
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/notifications/register-device
 *
 * Deactivate an FCM device token (e.g. on logout).
 *
 * Body: { token: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { token } = await parseBody(request);

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    await prisma.deviceToken.updateMany({
      where: { token },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[notifications] unregister-device failed:', error);
    return NextResponse.json(
      { error: 'Failed to unregister device' },
      { status: 500 },
    );
  }
}
