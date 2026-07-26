import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.pujaPandit.findFirst({
      where: { pujaId: params.id },
      include: { puja: true, pandit: true },
    });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return jsonResponse(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(request);
    const item = await prisma.pujaPandit.update({
      where: { pujaId_panditId: { pujaId: params.id, panditId: body.panditId } },
      data: body,
    });
    return jsonResponse(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const panditId = searchParams.get('panditId');
    if (panditId) {
      await prisma.pujaPandit.delete({
        where: { pujaId_panditId: { pujaId: params.id, panditId } },
      });
    } else {
      await prisma.pujaPandit.deleteMany({ where: { pujaId: params.id } });
    }
    return jsonResponse({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
