import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse } from '@/lib/api-utils';
import { getStoreConfig, DEFAULT_STORE_CONFIG } from '@/lib/store-config';

export async function GET() {
  try {
    const config = await getStoreConfig();
    return jsonResponse(config);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.food_open_time === 'string') data.foodOpenTime = body.food_open_time;
    if (typeof body.food_close_time === 'string') data.foodCloseTime = body.food_close_time;
    if (typeof body.food_is_open === 'boolean') data.foodIsOpen = body.food_is_open;
    if (typeof body.payment_mode === 'string') data.paymentMode = body.payment_mode;

    const config = await prisma.storeConfig.upsert({
      where: { id: 'store' },
      update: data,
      create: { ...DEFAULT_STORE_CONFIG, ...data },
    });
    return jsonResponse(config);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
