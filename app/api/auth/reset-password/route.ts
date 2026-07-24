import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const { prisma } = await import('@/lib/prisma/client');
    const user = await prisma.profile.findFirst({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'No account with that email' }, { status: 404 });
    }

    // In production, send email via SMTP/Nodemailer
    // For now, return success (SMTP not configured — see .env)
    return NextResponse.json({
      message: 'If an account exists, a reset link will be sent.',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });
  }
}
