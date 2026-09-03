import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { applyProductImport } from '@/lib/product-import-apply';
import type { ParsedPujaItem, ProductType } from '@/lib/puja-import-types';

const IMPORTABLE_TYPES: ProductType[] = ['food', 'natural', 'general'];

export async function POST(request: NextRequest) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
    let body: { items?: unknown; productType?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body. Expected JSON.' }, { status: 400 });
    }

    const rawType = String(body.productType ?? '');
    if (!IMPORTABLE_TYPES.includes(rawType as ProductType)) {
      return NextResponse.json({ error: 'Unsupported product type for this import.' }, { status: 400 });
    }
    const productType = rawType as ProductType;

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems.filter(
      (row): row is ParsedPujaItem =>
        !!row && typeof (row as ParsedPujaItem).name === 'string' && (row as ParsedPujaItem).name.trim().length > 0,
    );
    if (items.length === 0) {
      return NextResponse.json({ error: 'Nothing to import — every row is missing its name.' }, { status: 400 });
    }

    const summary = await applyProductImport(items, productType);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error('[admin/import/product] failed:', error);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Import failed. Please check the data and try again.' }, { status: 500 });
  }
}