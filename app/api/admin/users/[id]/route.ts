import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/admin-auth';
import { computeOrderAmounts } from '@/lib/order-refunds';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
    const user = await prisma.profile.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        _count: { select: { orders: true, supportTickets: true, reviews: true, wishlists: true, addresses: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: params.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: params.id },
      include: { order: { select: { id: true, orderNumber: true, status: true, total: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return jsonResponse({
      user,
      orders: orders.map((o) => ({
        ...o,
        amounts: computeOrderAmounts(o),
      })),
      tickets,
    });
  } catch (error) {
    console.error('[admin/users] detail failed:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}