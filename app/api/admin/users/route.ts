import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/admin-auth';

function serializeUser(u: any) {
  const { password, ...rest } = u;
  return {...rest};
}

export async function GET(request: NextRequest) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').toLowerCase();
    const role = searchParams.get('role');

    const users = await prisma.profile.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { fullName: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { orders: true, supportTickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return jsonResponse(users.map(serializeUser));
  } catch (error) {
    console.error('[admin/users] fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
    const body = await parseBody(request);
    const id = String(body.id ?? body.user_id ?? '');
    if (!id) {
      return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
    }
    const wantsActive = body.isActive ?? body.is_active;
    if (typeof wantsActive !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean.' }, { status: 400 });
    }

    const existing = await prisma.profile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Never allow deactivating an admin to lock out the panel.
    if (existing.role === 'admin' && wantsActive === false) {
      return NextResponse.json(
        { error: 'Admin accounts cannot be deactivated.' },
        { status: 400 }
      );
    }

    const user = await prisma.profile.update({
      where: { id },
      data: { isActive: wantsActive },
    });
    return jsonResponse(serializeUser(user));
  } catch (error) {
    console.error('[admin/users] update failed:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}