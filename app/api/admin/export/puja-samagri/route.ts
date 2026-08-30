import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma/client';
import { requireAdmin } from '@/lib/admin-auth';

const chipLabels: Record<string, string> = {
  coconut_nariyal: 'Coconut (Nariyal)',
  agarbatti: 'Agarbatti (Incense)',
  camphor_kapur: 'Camphor (Kapur)',
  deep_diya: 'Deep (Diya)',
  kapor_vastra: 'Kapor (Vastra)',
  fool_flowers: 'Fool (Flowers)',
  gamcha: 'Gamcha',
  ghee: 'Ghee',
  rice_akshat: 'Rice (Akshat)',
  kalash: 'Kalash',
  betel_leaf: 'Betel Leaf (Paan)',
  fruits_fal: 'Fruits (Fal)',
  roli_kumkum: 'Roli & Kumkum',
  haldi: 'Haldi (Turmeric)',
  chandan: 'Chandan (Sandalwood)',
  supari: 'Supari (Betel Nut)',
  elaichi: 'Elaichi (Cardamom)',
  ganga_jal: 'Ganga Jal',
  moli_kalava: 'Moli (Kalava)',
  bel_patra: 'Bel Patra',
  other: 'Other',
};

const currency = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export async function GET(request: NextRequest) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'puja_samagri';
    const sheetName = { food: 'Food', puja_samagri: 'Puja Samagri', natural: 'Natural Products', general: 'General' }[type] ?? type;
    const fileBase = { food: 'food', puja_samagri: 'puja-samagri', natural: 'natural-products', general: 'general' }[type] ?? type;

    const products = await prisma.product.findMany({
      where: { productType: type },
      include: {
        category: true,
        subCategory: true,
        brand: true,
        productImages: { orderBy: { sortOrder: 'asc' } },
        pujaItems: { include: { puja: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sajjan Mart Admin';
    wb.created = new Date();
    const ws = wb.addWorksheet(sheetName);

    ws.columns = [
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Slug', key: 'slug', width: 28 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Category', key: 'productType', width: 16 },
      { header: 'Sub Category', key: 'subCategory', width: 20 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Chip', key: 'chip', width: 22 },
      { header: 'Purchase Price (Rs)', key: 'purchasePrice', width: 15 },
      { header: 'Sales Price (Rs)', key: 'salesPrice', width: 14 },
      { header: 'Discount %', key: 'discount', width: 12 },
      { header: 'Final Price (Rs)', key: 'finalPrice', width: 14 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Quantity Type', key: 'quantityType', width: 14 },
      { header: 'Stock Type', key: 'stockType', width: 14 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Gender', key: 'gender', width: 14 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Review Count', key: 'reviewCount', width: 12 },
      { header: 'Is Featured', key: 'isFeatured', width: 11 },
      { header: 'Is Best Seller', key: 'isBestSeller', width: 13 },
      { header: 'Is Popular', key: 'isPopular', width: 11 },
      { header: 'Is Today Deal', key: 'isTodayDeal', width: 13 },
      { header: 'Is Active', key: 'isActive', width: 10 },
      { header: 'Sort Order', key: 'sortOrder', width: 10 },
      { header: 'Image URLs', key: 'images', width: 60 },
      { header: 'Linked Festivals', key: 'festivals', width: 60 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];

    for (const p of products) {
      const sales = currency(p.salesPrice);
      const discount = currency(p.discountPercent);
      ws.addRow({
        name: p.name,
        slug: p.slug,
        description: p.description ?? '',
        productType: p.category?.name ?? '',
        subCategory: p.subCategory?.name ?? '',
        brand: p.brand?.name ?? '',
        chip: chipLabels[p.productCategory ?? ''] ?? p.productCategory ?? '',
        purchasePrice: currency(p.purchasePrice),
        salesPrice: sales,
        discount,
        finalPrice: Math.round(sales * (1 - discount / 100) * 100) / 100,
        quantity: p.quantity === null ? '' : Number(p.quantity),
        quantityType: p.quantityType ?? '',
        stockType: p.stockType ?? '',
        stock: p.stock,
        gender: p.gender ?? '',
        rating: Number(p.rating),
        reviewCount: p.reviewCount,
        isFeatured: p.isFeatured ? 'Yes' : 'No',
        isBestSeller: p.isBestSeller ? 'Yes' : 'No',
        isPopular: p.isPopular ? 'Yes' : 'No',
        isTodayDeal: p.isTodayDeal ? 'Yes' : 'No',
        isActive: p.isActive ? 'Yes' : 'No',
        sortOrder: p.sortOrder,
        images: p.productImages.map((i) => i.url).join(', '),
        festivals: p.pujaItems.map((pi) => pi.puja?.name ?? '').filter(Boolean).join(', '),
        createdAt: p.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        updatedAt: p.updatedAt.toISOString().slice(0, 16).replace('T', ' '),
      });
    }

    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB45309' },
    };
    header.alignment = { vertical: 'middle' };
    header.height = 22;
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const buf = await wb.xlsx.writeBuffer();
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileBase}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('[admin/export/puja-samagri] failed:', error);
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
  }
}