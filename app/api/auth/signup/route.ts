import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 });
    }

    const existing = await prisma.profile.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const profile = await prisma.profile.create({
      data: {
        email,
        fullName,
        password: hashed,
        role: 'customer',
      },
    });

    return NextResponse.json({ id: profile.id, email: profile.email }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
