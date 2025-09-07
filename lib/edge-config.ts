import { get as edgeGet } from '@vercel/edge-config';

export type FeaturedItem = {
  id: string;
  name: string;
  brand: string;
  cover_cdn_url: string | null;
};

export const FEATURED_KEY = 'featured_glasses';

export async function readFeaturedFromEdgeConfig(): Promise<FeaturedItem[] | null> {
  try {
    // When EDGE_CONFIG is not configured or request fails, return null
    const items = (await edgeGet(FEATURED_KEY)) as FeaturedItem[] | undefined | null;
    if (!items || !Array.isArray(items)) return null;
    return items;
  } catch (_e) {
    return null;
  }
}

// Optional: Update Edge Config via Vercel API when tokens are provided.
export async function writeFeaturedToEdgeConfig(items: FeaturedItem[]) {
  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const apiToken = process.env.VERCEL_API_TOKEN;
  if (!edgeConfigId || !apiToken) {
    throw new Error('Missing EDGE_CONFIG_ID or VERCEL_API_TOKEN environment variables');
  }
  const teamId = process.env.VERCEL_TEAM_ID; // optional
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  const url = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items${qs}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          op: 'upsert',
          key: FEATURED_KEY,
          value: items,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update Edge Config: ${res.status} ${text}`);
  }
}

