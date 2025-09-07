-- Glasses table
CREATE TABLE IF NOT EXISTS public.glasses (
  id UUID PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  style TEXT,
  shape TEXT,
  glasses_shape TEXT,
  color TEXT,
  sex TEXT CHECK (sex IN ('men','women','unisex')) DEFAULT 'unisex',
  frame_width_mm INT,
  lens_height_mm INT,
  price_cents INT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Media assets
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY,
  glasses_id UUID NOT NULL REFERENCES public.glasses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reference','gallery_image','video')),
  storage_key TEXT,
  cdn_url TEXT,
  mime TEXT,
  width INT,
  height INT,
  duration_ms INT,
  checksum TEXT,
  alt_text TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_assets_glasses_id ON public.media_assets(glasses_id);

-- Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  glasses_id UUID NOT NULL REFERENCES public.glasses(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
