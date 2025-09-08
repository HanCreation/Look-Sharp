import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env and .env.local for standalone execution
try {
  const dotenv = await import('dotenv');
  dotenv.config();
  const localPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(localPath)) dotenv.config({ path: localPath, override: true });
} catch {}

// Optional import for Vercel Blob (lazy)
let put = null;

const SEED_DIR = path.join(process.cwd(), '.seed_data');
const PUBLIC_ASSET_PREFIX = path.posix.join('assets', 'glasses');

function getDatabaseUrl() {
  const url = (
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ''
  );
  if (!url) {
    console.error('No Postgres URL found. Set POSTGRES_PRISMA_URL or DATABASE_URL to your Supabase connection string.');
    process.exit(1);
  }
  console.log('[labels->pg] Using database URL:', url.replace(/:[^:@/]+@/, ':****@'));
  return url;
}

function adjustForPgBouncer(u) {
  if (!u) return '';
  try {
    const url = new URL(u);
    const isPooler = url.hostname.includes('pooler.supabase.com') || url.port === '6543';
    if (isPooler && !url.searchParams.has('pgbouncer')) url.searchParams.set('pgbouncer', 'true');
    if (!url.searchParams.has('sslmode')) url.searchParams.set('sslmode', 'require');
    return url.toString();
  } catch { return u; }
}

function isPostgresUrl(url) {
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

function requireBlobUploads() {
  const v = String(process.env.REQUIRE_BLOB_FOR_IMAGES || '').trim();
  if (v === '1' || /^(true|yes|on)$/i.test(v)) return true;
  // Default: when targeting Postgres/Supabase, require Blob to avoid dangling local public refs
  return isPostgresUrl(getDatabaseUrl());
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function maybeUploadToBlob(key, bytes, contentType) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  if (!put) ({ put } = await import('@vercel/blob'));
  const res = await put(key, bytes, { access: 'public', contentType, token });
  return { key: res.pathname, url: res.url };
}

function copyToPublic(key, bytes) {
  const out = path.join(process.cwd(), 'public', key);
  ensureDir(path.dirname(out));
  fs.writeFileSync(out, bytes);
  return { key, url: '/' + key.replace(/\\/g, '/') };
}

function uuidFromString(s) {
  const h = crypto.createHash('sha1').update(String(s)).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function pngDimensions(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(24);
  try {
    fs.readSync(fd, buf, 0, 24, 0);
    const sig = buf.slice(0, 8);
    const expected = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!sig.equals(expected)) return { width: null, height: null, mime: 'application/octet-stream' };
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), mime: 'image/png' };
  } catch {
    return { width: null, height: null, mime: 'application/octet-stream' };
  } finally { try { fs.closeSync(fd); } catch {} }
}

function jpegDimensions(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const read = (len, pos) => {
    const b = Buffer.alloc(len);
    const n = fs.readSync(fd, b, 0, len, pos);
    if (n < len) throw new Error('EOF');
    return b;
  };
  try {
    let pos = 0;
    let b = read(2, pos); pos += 2;
    if (b[0] !== 0xff || b[1] !== 0xd8) return { width: null, height: null, mime: 'application/octet-stream' };
    while (true) {
      b = read(2, pos); pos += 2;
      if (b[0] !== 0xff) continue;
      let marker = b[1];
      while (marker === 0xff) { b = read(1, pos); pos += 1; marker = b[0]; }
      if (marker === 0xD9 || marker === 0xDA) break;
      const lb = read(2, pos); pos += 2; const len = (lb[0] << 8) + lb[1];
      if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
        const seg = read(len - 2, pos);
        return { height: (seg[1] << 8) + seg[2], width: (seg[3] << 8) + seg[4], mime: 'image/jpeg' };
      } else {
        pos += len - 2;
      }
    }
  } catch {}
  finally { try { fs.closeSync(fd); } catch {} }
  return { width: null, height: null, mime: 'application/octet-stream' };
}

function imageInfo(filePath) {
  const sig = Buffer.alloc(4);
  try { const fd = fs.openSync(filePath, 'r'); fs.readSync(fd, sig, 0, 4, 0); fs.closeSync(fd); } catch {}
  if (sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47) return pngDimensions(filePath);
  if (sig[0] === 0xff && sig[1] === 0xd8) return jpegDimensions(filePath);
  return { width: null, height: null, mime: 'application/octet-stream' };
}

function sha1File(filePath) {
  const hash = crypto.createHash('sha1');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

// --- CSV (labels only) ------------------------------------------------------
function normalizeHeader(h) {
  const k = h.trim().toLowerCase();
  const map = {
    key: 'key',
    filename: 'filename',
    file: 'filename',
    sku: 'sku',
    name: 'name',
    model: 'name',
    brand: 'brand',
    style: 'style',
    shape: 'shape',
    color: 'color',
    sex: 'sex',
    frame_width_mm: 'frameWidthMm',
    framewidthmm: 'frameWidthMm',
    framewidth: 'frameWidthMm',
    lens_height_mm: 'lensHeightMm',
    lensheightmm: 'lensHeightMm',
    lensheight: 'lensHeightMm',
    price_cents: 'priceCents',
    pricecents: 'priceCents',
    price_usd: 'priceUsd',
    priceusd: 'priceUsd',
    tags: 'tags',
    alt: 'altText',
    alt_text: 'altText',
    alttext: 'altText',
  };
  return map[k] || h.trim();
}

function parseCsvLine(line) {
  const out = []; let cur = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; } }
      else { cur += ch; }
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') { inQuotes = true; }
      else { cur += ch; }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function loadLabelsCsv() {
  const p = path.join(SEED_DIR, 'labels.csv');
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0 && !/^\s*#/.test(l));
  if (raw.length === 0) return [];
  const headers = parseCsvLine(raw[0]).map(normalizeHeader);
  const rows = raw.slice(1).map((ln) => parseCsvLine(ln)).map((vals) => {
    const o = {}; headers.forEach((h, i) => { if (h) o[h] = vals[i] ?? ''; });
    return o;
  });

  const list = rows.map((r) => {
    const item = { ...r };
    const n = (v) => { const x = Number(String(v || '').replace(/[^0-9.-]/g, '')); return Number.isFinite(x) ? x : undefined; };
    if (item.priceUsd && !item.priceCents) item.priceCents = Math.round(n(item.priceUsd) * 100);
    if (item.priceCents) item.priceCents = n(item.priceCents);
    if (item.frameWidthMm) item.frameWidthMm = n(item.frameWidthMm);
    if (item.lensHeightMm) item.lensHeightMm = n(item.lensHeightMm);
    if (item.tags) item.tags = String(item.tags).split(/[;,|]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (item.sex) { const sx = String(item.sex).toLowerCase(); item.sex = ['men','women','unisex'].includes(sx) ? sx : 'unisex'; }
    return item;
  });
  return list;
}

function normalizeShape(s) {
  if (!s) return null; const k = s.toLowerCase();
  if (/wayfarer/.test(k)) return 'wayfarer';
  if (/aviator/.test(k)) return 'aviator';
  if (/round/.test(k)) return 'round';
  if (/rectang|rectangle|rectangular/.test(k)) return 'rectangle';
  if (/square/.test(k)) return 'square';
  if (/oval/.test(k)) return 'oval';
  if (/cat[-\s]?eye|cateye/.test(k)) return 'cat-eye';
  if (/browline/.test(k)) return 'browline';
  if (/geometric|hexagon|octagon|polygon/.test(k)) return 'geometric';
  return null;
}

function normalizeColor(s) {
  if (!s) return null; const k = s.toLowerCase();
  if (/tortoise|havana/.test(k)) return 'tortoise';
  if (/crystal|clear|transparent/.test(k)) return 'clear';
  if (/gunmetal|graphite|charcoal/.test(k)) return 'gunmetal';
  if (/rose gold/.test(k)) return 'rose';
  if (/grey/.test(k)) return 'gray';
  const allow = ['black','gold','silver','brown','blue','green','red','pink','gray','amber','champagne'];
  for (const a of allow) if (k.includes(a)) return a;
  return null;
}

function findImageByKey(key) {
  if (!key) return null;
  const tryExts = ['.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG'];
  for (const ext of tryExts) {
    const p = path.join(SEED_DIR, key + ext);
    if (fs.existsSync(p)) return p;
  }
  // Fallback: scan one level deep
  const entries = fs.existsSync(SEED_DIR) ? fs.readdirSync(SEED_DIR, { withFileTypes: true }) : [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    for (const ext of tryExts) {
      const p = path.join(SEED_DIR, e.name, key + ext);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

async function main() {
  // Ensure schema is applied first (e.g., `npm run prisma:push`).
  if (!fs.existsSync(SEED_DIR)) {
    console.error(`Seed directory not found: ${SEED_DIR}`);
    process.exit(1);
  }

  const labels = loadLabelsCsv();
  if (labels.length === 0) {
    console.error('labels.csv not found or empty under ./.seed_data');
    process.exit(1);
  }
  console.log(`[labels->pg] Found ${labels.length} labeled item(s)`);

  const url = adjustForPgBouncer(getDatabaseUrl());
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const mustBlob = requireBlobUploads();

  try {
    for (const it of labels) {
      const sku = String(it.sku || '').trim();
      const name = String(it.name || '').trim();
      const brand = String(it.brand || '').trim() || 'LookSharp';
      if (!sku || !name) {
        console.warn(`[skip] Missing required sku/name for key=${it.key || it.filename || '?'}; row skipped.`);
        continue;
      }

      const now = new Date();
      const id = uuidFromString(sku);
      const shape = normalizeShape(it.shape) || null;
      const color = normalizeColor(it.color) || null;
      const sex = it.sex || 'unisex';
      const tags = Array.isArray(it.tags) ? it.tags : [];

      const g = await prisma.glasses.upsert({
        where: { sku },
        update: {},
        create: {
          id,
          sku,
          name,
          brand,
          style: it.style || null,
          shape: shape,
          glassesShape: shape,
          color: color,
          sex: sex,
          frameWidthMm: it.frameWidthMm ?? null,
          lensHeightMm: it.lensHeightMm ?? null,
          priceCents: it.priceCents ?? null,
          tags: tags,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Attach reference image if present
      const imgKey = it.key || it.filename || '';
      const imgPath = findImageByKey(path.parse(String(imgKey)).name);
      if (!imgPath) {
        console.warn(`[warn] No image found for key=${imgKey} (SKU ${sku}). Product inserted without asset.`);
        continue;
      }

      const bytes = fs.readFileSync(imgPath);
      const info = imageInfo(imgPath);
      const checksum = sha1File(imgPath);
      const base = path.parse(imgPath).base;
      const storageKey = path.posix.join(PUBLIC_ASSET_PREFIX, sku, base);
      let uploaded = null;
      try { uploaded = await maybeUploadToBlob(storageKey, bytes, info.mime); } catch (e) { console.warn('Blob upload failed, falling back to public:', e?.message || e); }
      if (mustBlob && !uploaded) {
        throw new Error('Image upload required but BLOB_READ_WRITE_TOKEN missing or upload failed. Set REQUIRE_BLOB_FOR_IMAGES=0 to allow public fallback.');
      }
      const dest = uploaded ?? copyToPublic(storageKey, bytes);

      await prisma.mediaAsset.upsert({
        where: { id: uuidFromString(sku + ':' + base) },
        update: {},
        create: {
          id: uuidFromString(sku + ':' + base),
          glassesId: g.id,
          type: 'reference',
          storageKey: dest.key,
          cdnUrl: dest.url,
          mime: info.mime,
          width: info.width ?? null,
          height: info.height ?? null,
          durationMs: null,
          checksum,
          altText: it.altText || `${brand} ${name} - ${color || shape || 'image'}`,
          sortOrder: 0,
          createdAt: now,
        },
      });

      console.log(`Seeded (labels->pg): ${brand} ${name} [${sku}]`);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('Postgres seed (labels.csv only) complete');
}

main().catch((e) => { console.error(e); process.exit(1); });

