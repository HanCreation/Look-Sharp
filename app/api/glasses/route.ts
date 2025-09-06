import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') ?? undefined;
  const brand = searchParams.get('brand') ?? undefined;
  const style = searchParams.get('style') ?? undefined;
  const shape = searchParams.get('shape') ?? undefined;
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '12')));

  const repo = await getRepo();
  const { items, total } = await repo.listGlasses({ query, brand, style, shape, page, limit });

  return NextResponse.json({ items, total, page, limit }, { status: 200 });
}

