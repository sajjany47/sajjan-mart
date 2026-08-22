import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';
import { sendTicketCreatedMail } from '@/lib/mailer';

function generateTicketNumber(): string {
  return `TKT-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const items = await prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true } },
        order: { select: { id: true, orderNumber: true, status: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return jsonResponse(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const item = await prisma.supportTicket.create({
      data: { ...body, ticketNumber: generateTicketNumber() },
    });

    // Notify admin with only this ticket's details (never blocks the response)
    prisma.supportTicket
      .findUnique({
        where: { id: item.id },
        include: {
          user: { select: { email: true, fullName: true, phone: true } },
          order: { select: { orderNumber: true, status: true, total: true } },
        },
      })
      .then((full) => full && sendTicketCreatedMail(full))
      .catch((e) => console.error('[tickets] ticket-mail failed:', e));

    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}