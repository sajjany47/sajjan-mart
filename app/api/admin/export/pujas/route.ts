import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { PUJA_CHIP_LABELS } from '@/lib/puja-import-types';

const currency = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const yesNo = (v: boolean) => (v ? 'Yes' : 'No');

function styleSheet(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

const CHIP_LABEL_BY_SLUG: Record<string, string> = {};
for (const [slug, label] of PUJA_CHIP_LABELS) {
  CHIP_LABEL_BY_SLUG[slug] = label;
}

export async function GET(request: NextRequest) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
    const { searchParams } = new URL(request.url);
    const isTemplate = searchParams.get('template') === '1';

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sajjan Mart Admin';
    wb.created = new Date();

    // Sheet 1: puja packages — same columns the import accepts.
    const pujaSheet = wb.addWorksheet('Pujas');
    pujaSheet.columns = [
      { header: 'Puja Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Image URL', key: 'imageUrl', width: 45 },
      { header: 'Is Active', key: 'isActive', width: 10 },
      { header: 'Base Price (Rs)', key: 'basePrice', width: 14 },
      { header: 'Items', key: 'items', width: 80 },
    ];

    // Sheet 2: puja samagri catalog — keeps export/edit/import round-trips intact.
    const itemSheet = wb.addWorksheet('Puja Items');
    itemSheet.columns = [
      { header: 'Item Name', key: 'name', width: 32 },
      { header: 'Price (Rs)', key: 'price', width: 12 },
      { header: 'Purchase Price (Rs)', key: 'purchasePrice', width: 17 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Image URL', key: 'images', width: 60 },
      { header: 'Category', key: 'category', width: 24 },
      { header: 'Is Active', key: 'isActive', width: 10 },
    ];

    if (isTemplate) {
      // Demo workbook: headers + clearly-marked example rows to copy/paste over.
      itemSheet.addRow({
        name: 'Coconut (example — delete or replace this row)',
        price: 55,
        purchasePrice: 33,
        description: 'Example row. Keep the header row (row 1) unchanged and replace or delete this row with your data.',
        images: '',
        category: 'Coconut (Nariyal)',
        isActive: 'Yes',
      });
      itemSheet.addRow({
        name: 'Diya (example — delete or replace this row)',
        price: 100,
        purchasePrice: 60,
        description: '',
        images: '',
        category: 'Deep (Diya)',
        isActive: 'Yes',
      });
      pujaSheet.addRow({
        name: 'Demo Puja (delete or replace this row)',
        description: 'Example row. Fill Puja Name and put the item names from the Puja Items sheet into the Items column (comma separated, optional quantity prefix like 2 x Coconut).',
        imageUrl: '',
        isActive: 'Yes',
        basePrice: 210,
        items: '2 x Coconut, Diya',
      });

      for (const ws of [pujaSheet, itemSheet]) {
        styleSheet(ws);
      }
      const buf = await wb.xlsx.writeBuffer();
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="puja-import-demo.xlsx"',
        },
      });
    }

    const [pujas, samagri] = await Promise.all([
      prisma.puja.findMany({
        include: {
          items: {
            include: { product: { select: { name: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: { productType: 'puja_samagri' },
        include: { productImages: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    for (const puja of pujas) {
      const itemNames = puja.items.map((it) => {
        const name = it.product?.name ?? it.name;
        return it.defaultQty > 1 ? `${it.defaultQty} x ${name}` : name;
      });
      pujaSheet.addRow({
        name: puja.name,
        description: puja.description ?? '',
        imageUrl: puja.imageUrl ?? '',
        isActive: yesNo(puja.isActive),
        basePrice: currency(puja.basePrice),
        items: itemNames.join(', '),
      });
    }

    for (const product of samagri) {
      itemSheet.addRow({
        name: product.name,
        price: currency(product.salesPrice),
        purchasePrice: currency(product.purchasePrice),
        description: product.description ?? '',
        images: product.productImages.map((img) => img.url).join(', '),
        category: CHIP_LABEL_BY_SLUG[product.productCategory ?? ''] ?? product.productCategory ?? '',
        isActive: yesNo(product.isActive),
      });
    }

    for (const ws of [pujaSheet, itemSheet]) {
      styleSheet(ws);
    }

    const buf = await wb.xlsx.writeBuffer();
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="pujas.xlsx"',
      },
    });
  } catch (error) {
    console.error('[admin/export/pujas] failed:', error);
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
  }
}
