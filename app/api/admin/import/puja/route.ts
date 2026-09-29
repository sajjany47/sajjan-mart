import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { applyPujaImport } from '@/lib/puja-import-apply';
import type { ParsedPuja, ParsedPujaItem } from '@/lib/puja-import-types';

export async function POST(request: NextRequest) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
    let body: { items?: unknown; pujas?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body. Expected JSON.' }, { status: 400 });
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const rawPujas = Array.isArray(body.pujas) ? body.pujas : [];

    if (rawItems.length === 0 && rawPujas.length === 0) {
      return NextResponse.json({ error: 'Nothing to import — both sheets are empty.' }, { status: 400 });
    }

    const items = rawItems.filter(
      (row): row is ParsedPujaItem =>
        !!row && typeof (row as ParsedPujaItem).name === 'string' && (row as ParsedPujaItem).name.trim().length > 0,
    );
    const pujas = rawPujas.filter(
      (row): row is ParsedPuja =>
        !!row && typeof (row as ParsedPuja).name === 'string' && (row as ParsedPuja).name.trim().length > 0,
    );
    if (items.length === 0 && pujas.length === 0) {
      return NextResponse.json({ error: 'Nothing to import — every row is missing its name.' }, { status: 400 });
    }

    const summary = await applyPujaImport(items, pujas);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error('[admin/import/puja] failed:', error);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('category was not found')) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Import failed. Please check the data and try again.' }, { status: 500 });
  }
}
