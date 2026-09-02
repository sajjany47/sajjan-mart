import { NextRequest, NextResponse } from 'next/server';
import { getAccessPayload } from '@/lib/auth-cookies';

export async function requireAdmin(request: NextRequest) {
  const payload = getAccessPayload(request);
  if (!payload) {
    return { payload: null, response: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }
  if (payload.role !== 'admin') {
    return { payload: null, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return { payload, response: null };
}
