import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // TODO: Verify reset token before allowing password change
    // For now this requires the user to be authenticated via session
    const { prisma } = await import('@/lib/prisma/client');

    // Get user from session via auth header
    const sessionToken = request.cookies.get('next-auth.session-token')?.value;
    const session = sessionToken
      ? await prisma.session.findUnique({ where: { sessionToken } })
      : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.profile.update({
      where: { id: session.userId },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
