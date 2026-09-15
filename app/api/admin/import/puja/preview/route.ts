import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { parsePujaWorkbook } from '@/lib/puja-excel-import';
import { PUJA_CHIP_LABELS, type ChipOption } from '@/lib/puja-import-types';

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No file uploaded. Choose an .xlsx file first.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File is too large. Maximum allowed size is 15 MB.' }, { status: 400 });
    }
    if (!/\.xlsx$/i.test(file.name)) {
      return NextResponse.json({ error: 'Only .xlsx files are supported.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parsePujaWorkbook(buffer);
    if (parsed.errors.length > 0) {
      return NextResponse.json({ error: parsed.errors[0] }, { status: 400 });
    }

    // Read-only lookups so the review step can show "Update existing" vs "Add new".
    const [existingProducts, existingPujas] = await Promise.all([
      prisma.product.findMany({
        where: { productType: 'puja_samagri' },
        select: { name: true },
      }),
      prisma.puja.findMany({ select: { name: true } }),
    ]);
    const productNames = new Set(existingProducts.map((p) => p.name.trim().toLowerCase()));
    const pujaNames = new Set(existingPujas.map((p) => p.name.trim().toLowerCase()));

    const chipOptions: ChipOption[] = PUJA_CHIP_LABELS.map(([slug, label]) => ({ slug, label }));

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      warnings: parsed.warnings,
      chipOptions,
      sheets: [
        {
          kind: 'items',
          rows: parsed.items.map((row, idx) => ({
            rowId: `items-${idx}`,
            existing: productNames.has(row.name.trim().toLowerCase()),
            ...row,
          })),
        },
        {
          kind: 'pujas',
          rows: parsed.pujas.map((row, idx) => ({
            rowId: `pujas-${idx}`,
            existing: pujaNames.has(row.name.trim().toLowerCase()),
            ...row,
          })),
        },
      ],
    });
  } catch (error) {
    console.error('[admin/import/puja/preview] failed:', error);
    return NextResponse.json(
      { error: 'Could not read the Excel file. Please upload a valid .xlsx workbook.' },
      { status: 500 },
    );
  }
}
