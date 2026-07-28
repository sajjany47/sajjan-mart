import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const essentialId = searchParams.get('essentialId');
    const where = essentialId ? { essentialId } : {};
    const items = await prisma.essentialImage.findMany({ where, orderBy: { sortOrder: 'asc' } });
    return jsonResponse(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const item = await prisma.essentialImage.create({ data: body });
    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const essentialId = searchParams.get('essential_id');
    if (!essentialId) {
      return NextResponse.json({ error: 'essential_id is required' }, { status: 400 });
    }
    await prisma.essentialImage.deleteMany({ where: { essentialId } });
    return jsonResponse({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
