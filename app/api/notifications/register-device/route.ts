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
  let authenticatedUserId: string | null = null;
  let userRole: string | null = null;

  try {
    // Authenticate via Bearer header or cookie — user ID comes from authentication, not request body.
    const payload = getAccessPayload(request);
    if (!payload) {
      console.warn('[notifications] Device token registration rejected: Unauthorized request (missing or invalid token)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    authenticatedUserId = payload.id;
    userRole = payload.role;

    const { fcmToken, platform } = await parseBody(request);

    if (!fcmToken || typeof fcmToken !== 'string') {
      console.warn(
        `[notifications] Device token registration rejected | userId: ${authenticatedUserId} | role: ${userRole} | reason: fcmToken is required`,
      );
      return NextResponse.json(
        { error: 'fcmToken is required' },
        { status: 400 },
      );
    }

    const devicePlatform = platform && typeof platform === 'string' ? platform.toLowerCase() : 'android';

    // Upsert: if the token already exists, re-assign to the authenticated user and re-activate.
    const record = await prisma.deviceToken.upsert({
      where: { token: fcmToken },
      create: {
        userId: authenticatedUserId,
        token: fcmToken,
        platform: devicePlatform,
        isActive: true,
      },
      update: {
        userId: authenticatedUserId,
        isActive: true,
        platform: devicePlatform,
      },
    });

    // Count total active admin devices in database
    const activeAdminCount = await prisma.deviceToken.count({
      where: {
        isActive: true,
        user: { role: 'admin' },
      },
    });

    console.log(
      `[notifications] Device token registered successfully | admin userId: ${authenticatedUserId} | role: ${userRole} | platform: ${record.platform} | active admin devices: ${activeAdminCount}`,
    );

    return NextResponse.json({ id: record.id, success: true });
  } catch (error) {
    console.error(
      `[notifications] Device token registration failed | userId: ${authenticatedUserId ?? 'unauthenticated'} | role: ${userRole ?? 'unknown'} | error: ${error instanceof Error ? error.message : error}`,
    );
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
