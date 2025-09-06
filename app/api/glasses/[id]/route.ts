import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const repo = await getRepo();
  const item = await repo.getGlassesById(id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item, { status: 200 });
}

