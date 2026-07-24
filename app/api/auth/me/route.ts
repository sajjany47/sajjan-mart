import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await prisma.profile.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, fullName: true, role: true, avatarUrl: true },
    });

    if (!user) {
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
