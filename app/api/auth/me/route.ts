import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getAccessPayload } from '@/lib/auth-cookies';

export async function GET(request: NextRequest) {
  try {
    const payload = getAccessPayload(request);
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await prisma.profile.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, fullName: true, role: true, avatarUrl: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        image: user.avatarUrl,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
