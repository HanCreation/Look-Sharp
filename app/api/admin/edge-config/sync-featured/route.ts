import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { writeFeaturedToEdgeConfig, type FeaturedItem } from '@/lib/edge-config';

export const dynamic = 'force-dynamic';

function isAuthorized(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;
  const header = req.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length);
    return token === adminToken;
  }
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  return token === adminToken;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const repo = await getRepo();
    const res = await repo.listGlasses({ page: 1, limit: 15 } as any);
    const items: FeaturedItem[] = (res.items || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      brand: g.brand,
      cover_cdn_url: g.cover_cdn_url ?? null,
    }));

    await writeFeaturedToEdgeConfig(items);

    return NextResponse.json({ ok: true, count: items.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to sync featured items' }, { status: 500 });
  }
}

