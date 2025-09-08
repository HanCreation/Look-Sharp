import { get as edgeGet } from '@vercel/edge-config';

export type FeaturedItem = {
  id: string;
  name: string;
  brand: string;
  cover_cdn_url: string | null;
};

export const FEATURED_KEY = 'featured_glasses';

export async function readFeaturedFromEdgeConfig(): Promise<FeaturedItem[] | null> {
  // 1) Preferred: SDK read using EDGE_CONFIG connection string
  try {
    const raw = (await edgeGet(FEATURED_KEY)) as unknown;
    if (Array.isArray(raw)) return raw as FeaturedItem[];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as FeaturedItem[];
      } catch {}
    }
  } catch {}

  return null;
}

// Optional: Update Edge Config via Vercel API when tokens are provided.
export async function writeFeaturedToEdgeConfig(items: FeaturedItem[]) {
  // Resolve Edge Config ID from EDGE_CONFIG_ID or parse from EDGE_CONFIG connection string
  let edgeConfigId = process.env.EDGE_CONFIG_ID || '';
  const conn = process.env.EDGE_CONFIG;
  if (!edgeConfigId && conn) {
    if (conn.startsWith('ecfg_')) {
      edgeConfigId = conn;
    } else {
      try {
        const u = new URL(conn);
        const parts = (u.pathname || '').split('/').filter(Boolean);
        const found = parts.find((p) => p.startsWith('ecfg_'));
        if (found) edgeConfigId = found;
      } catch {
        // fallthrough; we'll error below if we still don't have an ID
      }
      if (!edgeConfigId) {
        const m = conn.match(/ecfg_[A-Za-z0-9]+/);
        if (m) edgeConfigId = m[0];
      }
    }
  }

  const apiToken = process.env.VERCEL_API_TOKEN;
  if (!edgeConfigId) throw new Error('EDGE_CONFIG_ID is missing and could not be derived from EDGE_CONFIG');
  if (!apiToken) throw new Error('Missing VERCEL_API_TOKEN environment variable');

  const teamId = process.env.VERCEL_TEAM_ID; // optional
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  const url = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items${qs}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          operation: 'upsert',
          key: FEATURED_KEY,
          value: items,
        },
      ],
    }),
  });

  if (!res.ok) {
    let detail = '';
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      detail = j?.error?.message ? ` - ${j.error.message}` : ` - ${text}`;
    } catch {
      detail = ` - ${text}`;
    }
    throw new Error(`Failed to update Edge Config: ${res.status}${detail}`);
  }
}
