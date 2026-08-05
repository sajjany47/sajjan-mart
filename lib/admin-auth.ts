import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return { payload: null, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }
  const payload = verifyToken(token);
  if (!payload) {
    return { payload: null, response: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }
  if (payload.role !== 'admin') {
    return { payload: null, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return { payload, response: null };
}
