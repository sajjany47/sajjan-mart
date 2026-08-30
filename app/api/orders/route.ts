import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';
import { getStoreConfig, isFoodOpenNow } from '@/lib/store-config';
import { computeOrderAmounts } from '@/lib/order-refunds';
import { sendOrderPlacedMails } from '@/lib/mailer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') ?? searchParams.get('user_id');
    const orderId = searchParams.get('id');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (orderId) where.id = orderId;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const items = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true, role: true, avatarUrl: true } },
        items: { include: { product: { select: { productType: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const orders = items.map(({ items: orderItems, ...order }) => ({
      ...order,
      order_items: orderItems,
      amounts: computeOrderAmounts({ ...order, items: orderItems }),
    }));
    return jsonResponse(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasFood, items: rawItems, ...orderData } = await parseBody(request);

    if (hasFood) {
      const config = await getStoreConfig();
      if (!isFoodOpenNow(config)) {
        return NextResponse.json(
          { error: 'The Food section is currently closed. Please try again during opening hours.' },
          { status: 400 }
        );
      }
    }

    // Deactivated accounts cannot place orders.
    if (orderData.userId) {
      const buyer = await prisma.profile.findUnique({
        where: { id: orderData.userId },
        select: { isActive: true },
      });
      if (buyer && buyer.isActive === false) {
        return NextResponse.json(
          { error: 'This account has been deactivated and cannot place orders.' },
          { status: 403 }
        );
      }
    }

    if (orderData.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: orderData.couponCode } });
      if (!coupon || !coupon.isActive) {
        return NextResponse.json({ error: 'Invalid or inactive coupon code.' }, { status: 400 });
      }
      if (coupon.isOneTime && orderData.userId) {
        const liveStatuses = ['pending', 'paid', 'confirmed', 'processing', 'packed', 'shipped', 'delivered'];
        const used = await prisma.order.count({
          where: {
            userId: orderData.userId,
            couponCode: orderData.couponCode,
            status: { in: liveStatuses },
          },
        });
        if (used > 0) {
          return NextResponse.json(
            { error: 'This coupon can only be used once per customer.' },
            { status: 400 }
          );
        }
      }
    }

    // Accept order items inline so order + items are created atomically
    const itemData = Array.isArray(rawItems)
      ? rawItems.map((it: Record<string, unknown>) => ({
          productId: (it.productId as string) ?? null,
          pujaId: (it.pujaId as string) ?? null,
          panditId: (it.panditId as string) ?? null,
          name: String(it.name ?? 'Item'),
          variantName: (it.variantName as string) ?? null,
          imageUrl: (it.imageUrl as string) ?? null,
          unitPrice: Number(it.unitPrice ?? 0),
          quantity: Number(it.quantity ?? 1),
          total: Number(it.total ?? 0),
          itemType: (it.itemType as string) ?? 'product',
          metadata: (it.metadata as object) ?? {},
        }))
      : [];

    // Tag food items so the admin orders screen can prioritise them for delivery
    // (independent of the product link, which can be deleted later).
    const productIds = itemData
      .flatMap((it) => (it.productId ? [it.productId] : []))
      .filter((x): x is string => typeof x === 'string');
    const productTypes = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, productType: true } })
      : [];
    const typeById = new Map(productTypes.map((p) => [p.id, p.productType]));
    for (const entry of itemData) {
      if (entry.itemType === 'product' && typeById.get(entry.productId as string) === 'food') {
        entry.itemType = 'food';
      }
    }

    const item = await prisma.order.create({
      data: {
        ...orderData,
        ...(itemData.length > 0 ? { items: { create: itemData } } : {}),
      } as any,
    });

    // Notify customer + admin (never blocks the response)
    prisma.order
      .findUnique({ where: { id: item.id }, include: { items: true, user: true } })
      .then((full) => full && sendOrderPlacedMails(full))
      .catch((e) => console.error('[orders] placed-mail failed:', e));

    return jsonResponse(item, { status: 201 });
  } catch (error) {
    console.error('[orders] create failed:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
