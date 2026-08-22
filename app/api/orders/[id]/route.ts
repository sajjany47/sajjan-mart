import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/admin-auth';
import { sendOrderStatusMail } from '@/lib/mailer';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.order.findUnique({
      where: { id: params.id },
      include: { user: true, items: true },
    });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return jsonResponse(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;
  try {
    const body = await parseBody(request);
    const before = await prisma.order.findUnique({
      where: { id: params.id },
      select: { status: true },
    });
    const item = await prisma.order.update({ where: { id: params.id }, data: body });

    // Notify the customer whenever the status changes (never blocks the response)
    const newStatus = typeof body.status === 'string' ? body.status : null;
    if (newStatus && before && before.status !== newStatus) {
      prisma.order
        .findUnique({ where: { id: params.id }, include: { items: true, user: true } })
        .then((full) => full && sendOrderStatusMail(full, newStatus))
        .catch((e) => console.error('[orders] status-mail failed:', e));
    }

    return jsonResponse(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.order.delete({ where: { id: params.id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
