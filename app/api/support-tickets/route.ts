import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';

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
    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}