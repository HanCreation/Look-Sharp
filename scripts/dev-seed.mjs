import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const dbPath = path.join(dataDir, 'dev.sqlite');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS glasses (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    style TEXT,
    shape TEXT,
    glasses_shape TEXT,
    color TEXT,
    frame_width_mm INTEGER,
    lens_height_mm INTEGER,
    price_cents INTEGER,
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    glasses_id TEXT NOT NULL,
    type TEXT NOT NULL,
    storage_key TEXT,
    cdn_url TEXT,
    mime TEXT,
    width INTEGER,
    height INTEGER,
    duration_ms INTEGER,
    checksum TEXT,
    alt_text TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    glasses_id TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );
`);

const now = new Date().toISOString();

function upsertGlasses(g) {
  const exists = db.prepare('SELECT 1 FROM glasses WHERE id = ?').get(g.id);
  if (exists) return;
  db.prepare(`INSERT INTO glasses (id, sku, name, brand, style, shape, glasses_shape, color, frame_width_mm, lens_height_mm, price_cents, tags, created_at, updated_at)
              VALUES (@id,@sku,@name,@brand,@style,@shape,@glasses_shape,@color,@frame_width_mm,@lens_height_mm,@price_cents,@tags,@created_at,@updated_at)`)
    .run({ ...g, tags: g.tags ? JSON.stringify(g.tags) : null });
}

function upsertAsset(a) {
  const exists = db.prepare('SELECT 1 FROM media_assets WHERE id = ?').get(a.id);
  if (exists) return;
  db.prepare(`INSERT INTO media_assets (id, glasses_id, type, storage_key, cdn_url, mime, width, height, duration_ms, checksum, alt_text, sort_order, created_at)
              VALUES (@id,@glasses_id,@type,@storage_key,@cdn_url,@mime,@width,@height,@duration_ms,@checksum,@alt_text,@sort_order,@created_at)`).run(a);
}

const id1 = '00000000-0000-0000-0000-000000000101';
upsertGlasses({
  id: id1,
  sku: 'LS-101',
  name: 'Aviator Classic',
  brand: 'LookSharp',
  style: 'classic',
  shape: 'aviator',
  glasses_shape: 'aviator',
  color: 'gold',
  frame_width_mm: 140,
  lens_height_mm: 48,
  price_cents: 12900,
  tags: ['lightweight','best_seller'],
  created_at: now,
  updated_at: now,
});

// Reference asset uses local public assets for dev
const refKey = path.posix.join('assets', 'glasses', 'LS-101', 'ref.png');
const refPublic = path.join(process.cwd(), 'public', refKey);
if (!fs.existsSync(path.dirname(refPublic))) fs.mkdirSync(path.dirname(refPublic), { recursive: true });
// Copy from repo HeroBackground.png just as placeholder; replace with real product ref in future
const placeholder = path.join(process.cwd(), 'HeroBackground.png');
if (fs.existsSync(placeholder) && !fs.existsSync(refPublic)) {
  fs.copyFileSync(placeholder, refPublic);
}
upsertAsset({
  id: '00000000-0000-0000-0000-000000001001',
  glasses_id: id1,
  type: 'reference',
  storage_key: refKey,
  cdn_url: '/' + refKey.replace(/\\/g, '/'),
  mime: 'image/png',
  width: null,
  height: null,
  duration_ms: null,
  checksum: null,
  alt_text: 'Reference image for Aviator Classic',
  sort_order: 0,
  created_at: now,
});

console.log('Seed complete:', dbPath);

