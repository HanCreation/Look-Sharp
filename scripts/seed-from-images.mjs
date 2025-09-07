import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Optional imports guarded at runtime
let PrismaClient = null;
let put = null;
let GoogleGenAI = null;

// Config
const SEED_DIR = path.join(process.cwd(), '.seed_data');
const PUBLIC_ASSET_PREFIX = path.posix.join('assets', 'glasses');

// Detect DB target like the app does
function getDatabaseUrl() {
  return (
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ''
  );
}

function isPostgresUrl(url) {
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

function titleCase(s) {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function sanitizeSkuPart(s) {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16);
}

function uuidFromString(s) {
  const h = crypto.createHash('sha1').update(s).digest('hex');
  // Format into UUID-like string
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function deterministicNumberFromString(s, min, max) {
  const h = crypto.createHash('md5').update(s).digest();
  let n = 0;
  for (let i = 0; i < 4; i++) n = (n << 8) + h[i];
  const range = max - min + 1;
  return min + (n % range);
}

function detectShape(str) {
  const s = str.toLowerCase();
  const shapes = [
    'aviator',
    'wayfarer',
    'round',
    'rectangle',
    'rectangular',
    'square',
    'oval',
    'cat-eye',
    'cateye',
    'browline',
    'geometric',
  ];
  for (const k of shapes) if (s.includes(k)) return k === 'rectangular' ? 'rectangle' : k;
  return null;
}

function normalizeShape(s) {
  if (!s) return null;
  const k = s.toLowerCase();
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

function detectStyle(str) {
  const s = str.toLowerCase();
  if (s.includes('sport')) return 'sport';
  if (s.includes('vintage') || s.includes('retro')) return 'vintage';
  if (s.includes('modern')) return 'modern';
  if (s.includes('minimal')) return 'minimal';
  return 'classic';
}

function detectColor(str) {
  const s = str.toLowerCase();
  const colors = [
    'black', 'gold', 'silver', 'tortoise', 'brown', 'blue', 'green', 'red', 'clear', 'transparent', 'gunmetal', 'rose', 'pink', 'gray', 'grey', 'amber', 'champagne', 'crystal'
  ];
  for (const c of colors) if (s.includes(c)) return c === 'grey' ? 'gray' : c;
  return null;
}

function normalizeColor(s) {
  if (!s) return null;
  const k = s.toLowerCase();
  if (/tortoise|havana/.test(k)) return 'tortoise';
  if (/crystal|clear|transparent/.test(k)) return 'clear';
  if (/gunmetal|graphite|charcoal/.test(k)) return 'gunmetal';
  if (/rose gold/.test(k)) return 'rose';
  if (/grey/.test(k)) return 'gray';
  const allow = ['black','gold','silver','brown','blue','green','red','pink','gray','amber','champagne'];
  for (const a of allow) if (k.includes(a)) return a;
  return null;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function listDir(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
}

function isImageFile(name) {
  return /\.(png|jpg|jpeg)$/i.test(name);
}

// --- CSV labels support ----------------------------------------------------
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
  // Parses a single CSV line into array of fields, respecting quotes.
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += ch;
      }
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
  if (!fs.existsSync(p)) return { list: [], byKey: new Map() };
  const raw = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0 && !/^\s*#/.test(l));
  if (raw.length === 0) return { list: [], byKey: new Map() };
  const headers = parseCsvLine(raw[0]).map(normalizeHeader);
  const rows = raw.slice(1).map((ln) => parseCsvLine(ln)).map((vals) => {
    const o = {};
    headers.forEach((h, i) => { if (h) o[h] = vals[i] ?? ''; });
    return o;
  });

  // Normalize and build index by key
  const list = rows.map((r) => {
    const item = { ...r };
    // coerce numeric fields
    const n = (v) => {
      const x = Number(String(v || '').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(x) ? x : undefined;
    };
    if (item.priceUsd && !item.priceCents) item.priceCents = Math.round(n(item.priceUsd) * 100);
    if (item.priceCents) item.priceCents = n(item.priceCents);
    if (item.frameWidthMm) item.frameWidthMm = n(item.frameWidthMm);
    if (item.lensHeightMm) item.lensHeightMm = n(item.lensHeightMm);
    if (item.tags) item.tags = String(item.tags).split(/[;,|]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (item.sex) {
      const sx = String(item.sex).toLowerCase();
      item.sex = ['men','women','unisex'].includes(sx) ? sx : 'unisex';
    }
    return item;
  });

  const byKey = new Map();
  for (const it of list) {
    // Primary lookup by explicit key
    if (it.key) byKey.set(String(it.key).trim(), it);
    // Also allow filename (with extension) or its basename
    if (it.filename) {
      const base = path.parse(String(it.filename).trim()).name;
      if (!byKey.has(base)) byKey.set(base, it);
    }
  }

  return { list, byKey };
}

function pngDimensions(filePath) {
  // PNG: signature (8), length (4), type (4), IHDR data (13), CRC (4)
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(24);
  try {
    fs.readSync(fd, buf, 0, 24, 0);
    // Validate PNG signature
    const sig = buf.slice(0, 8);
    const expected = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!sig.equals(expected)) return { width: null, height: null };
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } catch (e) {
    return { width: null, height: null };
  } finally {
    fs.closeSync(fd);
  }
}

function jpegDimensions(filePath) {
  // Minimal JPEG parser to read SOF segment for width/height
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
    if (b[0] !== 0xff || b[1] !== 0xd8) return { width: null, height: null };
    while (true) {
      // find next marker 0xFF
      b = read(2, pos); pos += 2;
      if (b[0] !== 0xff) continue;
      let marker = b[1];
      // Skip padding 0xFF
      while (marker === 0xff) { b = read(1, pos); pos += 1; marker = b[0]; }
      // Standalone markers without length
      if (marker === 0xD9 || marker === 0xDA) break; // EOI or SOS
      // Read segment length
      const lb = read(2, pos); pos += 2;
      const len = (lb[0] << 8) + lb[1];
      if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
        const seg = read(len - 2, pos); // length includes these two bytes
        // seg: [precision(1), height(2), width(2), ...]
        const height = (seg[1] << 8) + seg[2];
        const width = (seg[3] << 8) + seg[4];
        return { width, height };
      } else {
        pos += len - 2; // skip this segment
      }
    }
  } catch (_) {
    // ignore
  } finally {
    try { fs.closeSync(fd); } catch {}
  }
  return { width: null, height: null };
}

function imageInfo(filePath) {
  const sig = Buffer.alloc(4);
  try {
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, sig, 0, 4, 0);
    fs.closeSync(fd);
  } catch {}
  if (sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47) {
    const { width, height } = pngDimensions(filePath);
    return { mime: 'image/png', width, height };
  }
  if (sig[0] === 0xff && sig[1] === 0xd8) {
    const { width, height } = jpegDimensions(filePath);
    return { mime: 'image/jpeg', width, height };
  }
  return { mime: 'application/octet-stream', width: null, height: null };
}

function sha1File(filePath) {
  const hash = crypto.createHash('sha1');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function gatherSeedGroups() {
  const entries = listDir(SEED_DIR);
  const subdirs = entries.filter((e) => e.isDirectory());
  const imgFilesAtRoot = entries.filter((e) => e.isFile() && isImageFile(e.name));

  const groups = [];

  if (subdirs.length > 0) {
    for (const d of subdirs) {
      const dirPath = path.join(SEED_DIR, d.name);
      const files = listDir(dirPath)
        .filter((e) => e.isFile() && isImageFile(e.name))
        .map((e) => ({ abs: path.join(dirPath, e.name), base: e.name }));
      if (files.length === 0) continue;
      groups.push({ key: d.name, files });
    }
  }

  // If root has standalone PNGs, treat each file as its own product
  for (const f of imgFilesAtRoot) {
    groups.push({ key: path.parse(f.name).name, files: [{ abs: path.join(SEED_DIR, f.name), base: f.name }] });
  }

  return groups;
}

async function maybeUploadToBlob(key, bytes, contentType) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null; // caller should use local copy fallback

  if (!put) {
    // Lazy import
    ({ put } = await import('@vercel/blob'));
  }
  const res = await put(key, bytes, { access: 'public', contentType, token });
  return { key: res.pathname, url: res.url };
}

function copyToPublic(key, bytes) {
  const out = path.join(process.cwd(), 'public', key);
  ensureDir(path.dirname(out));
  fs.writeFileSync(out, bytes);
  const url = '/' + key.replace(/\\/g, '/');
  return { key, url };
}

function inferProductMeta(groupKey, fileNames) {
  const composite = `${groupKey} ${fileNames.join(' ')}`;
  const shape = detectShape(composite);
  const color = detectColor(composite);
  const style = detectStyle(composite);
  // Sex detection
  const lower = composite.toLowerCase();
  let sex = 'unisex';
  if (/(^|\W)(men|man|male|mens)($|\W)/.test(lower)) sex = 'men';
  if (/(^|\W)(women|woman|female|womens)($|\W)/.test(lower)) sex = 'women';

  const brandToken = groupKey.split(/[-_\s]+/)[0] || 'LookSharp';
  const brand = titleCase(brandToken);
  const model = titleCase(groupKey.replace(new RegExp('^' + brandToken + '[-_\s]*', 'i'), '')) || 'Model';

  const skuBase = `${sanitizeSkuPart(brandToken)}-${sanitizeSkuPart(model)}`.replace(/-+$/, '') || 'LS-MODEL';
  const skuNum = deterministicNumberFromString(groupKey, 100, 999);
  const sku = `${skuBase}-${skuNum}`;

  const frameWidthMm = deterministicNumberFromString(groupKey + 'w', 130, 150);
  const lensHeightMm = deterministicNumberFromString(groupKey + 'h', 38, 52);

  const premium = /gold|silver|gunmetal|titanium|pro|premium|deluxe/i.test(composite);
  const priceCents = premium
    ? deterministicNumberFromString(groupKey + 'p', 18900, 28900)
    : deterministicNumberFromString(groupKey + 'p', 8900, 16900);

  const tags = [];
  if (premium) tags.push('premium');
  if (/(gold|silver|gunmetal)/i.test(composite)) tags.push('metal');
  if (/(tortoise|crystal|clear|amber|champagne)/i.test(composite)) tags.push('acetate');
  if (/(light|lite|feather)/i.test(composite)) tags.push('lightweight');

  return { brand, model, sku, shape, style, color, sex, frameWidthMm, lensHeightMm, priceCents, tags };
}

function pickReferenceFile(files) {
  // Prefer names containing ref|reference|front; else first
  const preferred = files.find((f) => /\b(ref|reference|front)\b/i.test(f.base));
  return preferred || files[0];
}

async function seedSqlite(groups) {
  const Database = (await import('better-sqlite3')).default;
  const dbDir = path.join(process.cwd(), '.data');
  ensureDir(dbDir);
  const dbPath = path.join(dbDir, 'dev.sqlite');
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
  `);

  // Migration: add sex column if missing
  try {
    const cols = db.prepare('PRAGMA table_info(glasses)').all();
    const hasSex = cols.some((c) => c.name === 'sex');
    if (!hasSex) db.exec(`ALTER TABLE glasses ADD COLUMN sex TEXT`);
  } catch {}

  const nowIso = new Date().toISOString();

  for (const group of groups) {
    const names = group.files.map((f) => f.base);
    const meta = group.__meta || inferProductMeta(group.key, names);
    const id = uuidFromString(meta.sku);
    const exists = db.prepare('SELECT 1 FROM glasses WHERE sku = ?').get(meta.sku);
    if (exists) {
      console.log(`Skipping existing SKU (SQLite): ${meta.sku}`);
      continue;
    }
    db.prepare(`INSERT INTO glasses (id, sku, name, brand, style, shape, glasses_shape, color, sex, frame_width_mm, lens_height_mm, price_cents, tags, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id,
      meta.sku,
      meta.model,
      meta.brand,
      meta.style ?? null,
      meta.shape ?? null,
      meta.shape ?? null,
      meta.color ?? null,
      meta.sex ?? 'unisex',
      meta.frameWidthMm ?? null,
      meta.lensHeightMm ?? null,
      meta.priceCents ?? null,
      meta.tags && meta.tags.length ? JSON.stringify(meta.tags) : null,
      nowIso,
      nowIso,
    );

    const ref = pickReferenceFile(group.files);
    let order = 0;
    for (const f of group.files) {
      const bytes = fs.readFileSync(f.abs);
      const info = imageInfo(f.abs);
      const { width, height } = info;
      const checksum = sha1File(f.abs);
      const storageKey = path.posix.join(PUBLIC_ASSET_PREFIX, meta.sku, f.base);
      // Prefer Blob if token exists; otherwise copy to public
      let uploaded = null;
      try {
        uploaded = await maybeUploadToBlob(storageKey, bytes, info.mime);
      } catch (e) {
        console.warn('Blob upload failed, falling back to public:', e?.message || e);
      }
      const dest = uploaded ?? copyToPublic(storageKey, bytes);

      const assetId = uuidFromString(meta.sku + ':' + f.base);
      const isRef = f.base === ref.base;
      const fallbackAlt = `${meta.brand} ${meta.model} - ${meta.color || meta.shape || 'image'}`;
      const altForThis = isRef && meta.altText ? meta.altText : fallbackAlt;
      db.prepare(`INSERT INTO media_assets (id, glasses_id, type, storage_key, cdn_url, mime, width, height, duration_ms, checksum, alt_text, sort_order, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        assetId,
        id,
        isRef ? 'reference' : 'gallery_image',
        dest.key,
        dest.url,
        info.mime,
        width ?? null,
        height ?? null,
        null,
        checksum,
        altForThis,
        isRef ? 0 : ++order,
        nowIso,
      );
    }
    console.log(`Seeded (SQLite): ${meta.brand} ${meta.model} [${meta.sku}] with ${group.files.length} image(s)`);
  }

  console.log('SQLite seed complete:', dbPath);
}

async function seedPostgres(groups) {
  if (!PrismaClient) {
    ({ PrismaClient } = await import('@prisma/client'));
  }
  const prisma = new PrismaClient();

  try {
    for (const group of groups) {
      const names = group.files.map((f) => f.base);
      const meta = group.__meta || inferProductMeta(group.key, names);
      const id = uuidFromString(meta.sku);

      // Upsert glasses by SKU
      const now = new Date();
      const g = await prisma.glasses.upsert({
        where: { sku: meta.sku },
        update: {},
        create: {
          id,
          sku: meta.sku,
          name: meta.model,
          brand: meta.brand,
          style: meta.style ?? null,
          shape: meta.shape ?? null,
          glassesShape: meta.shape ?? null,
          color: meta.color ?? null,
          sex: (meta.sex ?? 'unisex'),
          frameWidthMm: meta.frameWidthMm ?? null,
          lensHeightMm: meta.lensHeightMm ?? null,
          priceCents: meta.priceCents ?? null,
          tags: meta.tags ?? [],
          createdAt: now,
          updatedAt: now,
        },
      });

      const ref = pickReferenceFile(group.files);
      let order = 0;
      for (const f of group.files) {
        const bytes = fs.readFileSync(f.abs);
        const info = imageInfo(f.abs);
        const { width, height } = info;
        const checksum = sha1File(f.abs);
        const storageKey = path.posix.join(PUBLIC_ASSET_PREFIX, meta.sku, f.base);
        let uploaded = null;
        try {
          uploaded = await maybeUploadToBlob(storageKey, bytes, info.mime);
        } catch (e) {
          console.warn('Blob upload failed, falling back to public:', e?.message || e);
        }
        const dest = uploaded ?? copyToPublic(storageKey, bytes);

        await prisma.mediaAsset.upsert({
          where: { id: uuidFromString(meta.sku + ':' + f.base) },
          update: {},
          create: {
            id: uuidFromString(meta.sku + ':' + f.base),
            glassesId: g.id,
            type: f.base === ref.base ? 'reference' : 'gallery_image',
            storageKey: dest.key,
            cdnUrl: dest.url,
            mime: info.mime,
            width: width ?? null,
            height: height ?? null,
            durationMs: null,
            checksum,
            altText: (f.base === ref.base && meta.altText) ? meta.altText : `${meta.brand} ${meta.model} - ${meta.color || meta.shape || 'image'}`,
            sortOrder: f.base === ref.base ? 0 : ++order,
            createdAt: new Date(),
          },
        });
      }
      console.log(`Seeded (Postgres): ${meta.brand} ${meta.model} [${meta.sku}] with ${group.files.length} image(s)`);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('Postgres seed complete');
}

async function aiInferMetadata(imagePath, fallbackMeta) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!GoogleGenAI) {
    ({ GoogleGenAI } = await import('@google/genai'));
  }
  const modelId = process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash-image-preview';
  const ai = new GoogleGenAI({ apiKey });
  const bytes = fs.readFileSync(imagePath);

  const prompt = `You are a product catalog expert. Inspect the attached eyewear product image and output a single JSON object with realistic attributes. If an attribute cannot be determined visually, infer a plausible but realistic value consistent with the image and common eyewear specs. Keep values simple and lowercase where applicable.

Return JSON only, no extra text, matching this TypeScript type:
{
  brand: string;              // recognizable brand or a generic-sounding brand if no logo is visible
  model: string;              // concise model name
  shape: string;              // one of: aviator, wayfarer, round, rectangle, square, oval, cat-eye, browline, geometric
  style: string;              // e.g., classic, modern, vintage, minimal, sport
  color: string;              // main frame color: black, gold, silver, tortoise, clear, gunmetal, brown, blue, green, red, pink, gray, amber, champagne
  sex: string;                // men | women | unisex (pick the most appropriate)
  material: string;           // e.g., metal, acetate, mixed
  frameWidthMm: number;       // realistic total frame width in mm (130–150 typical)
  lensHeightMm: number;       // realistic lens height in mm (38–52 typical)
  priceUsd: number;           // realistic retail price in USD (e.g., 89–289)
  tags: string[];             // short keywords like 'lightweight','metal','acetate','polarized','spring_hinge'
  altText: string;            // 8–14 words describing the frame in the image
}`;

  const contents = [
    { role: 'user', parts: [
      { inlineData: { mimeType: 'image/png', data: bytes.toString('base64') } },
      { text: prompt },
    ]},
  ];
  const config = {
    responseModalities: ['TEXT'],
    generationConfig: { responseMimeType: 'application/json' },
  };
  let raw;
  try {
    raw = await ai.models.generateContent({ model: modelId, contents, config });
  } catch (e) {
    console.warn('AI metadata call failed:', e?.message || e);
    return null;
  }

  // Extract text content robustly
  let text = '';
  try {
    text = raw?.outputText || raw?.response?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    if (!text && raw?.candidates?.[0]?.content?.parts) {
      const parts = raw.candidates[0].content.parts;
      text = parts.map((p) => p.text || '').join('');
    }
  } catch {}
  if (!text) return null;

  // Try to parse JSON
  let data = null;
  try {
    const m = text.match(/\{[\s\S]*\}/);
    data = JSON.parse(m ? m[0] : text);
  } catch (e) {
    console.warn('AI JSON parse failed');
    return null;
  }

  // Normalize fields and merge with fallback
  const shape = normalizeShape(data.shape) || fallbackMeta.shape || null;
  const color = normalizeColor(data.color) || fallbackMeta.color || null;
  const style = (data.style || fallbackMeta.style || 'classic').toLowerCase();
  let sex = (data.sex || fallbackMeta.sex || 'unisex').toLowerCase();
  if (!['men','women','unisex'].includes(sex)) sex = 'unisex';

  const brand = (data.brand || fallbackMeta.brand || 'LookSharp').toString().slice(0, 60);
  const model = (data.model || fallbackMeta.model || 'Model').toString().slice(0, 60);
  const frameWidthMm = Number.isFinite(data.frameWidthMm) ? Math.round(data.frameWidthMm) : fallbackMeta.frameWidthMm;
  const lensHeightMm = Number.isFinite(data.lensHeightMm) ? Math.round(data.lensHeightMm) : fallbackMeta.lensHeightMm;
  const priceCents = Number.isFinite(data.priceUsd) ? Math.round(data.priceUsd * 100) : fallbackMeta.priceCents;
  const tags = Array.isArray(data.tags) ? data.tags.map((t) => String(t).toLowerCase().replace(/\s+/g, '_')).slice(0, 10) : fallbackMeta.tags;
  const altText = typeof data.altText === 'string' && data.altText ? data.altText : undefined;

  return { brand, model, shape, style, color, sex, frameWidthMm, lensHeightMm, priceCents, tags, altText };
}

async function main() {
  if (!fs.existsSync(SEED_DIR)) {
    console.error(`Seed directory not found: ${SEED_DIR}`);
    console.error('Create it and add PNG files or subfolders per product.');
    process.exit(1);
  }

  const groups = gatherSeedGroups();
  if (groups.length === 0) {
    console.error('No PNG files found in ./.seed_data');
    process.exit(1);
  }

  // Load optional manual labels from CSV
  const { byKey: labelsByKey } = loadLabelsCsv();

  // Log preview
  console.log(`Found ${groups.length} product group(s) in ./.seed_data`);
  for (const g of groups) {
    console.log(`- ${g.key}: ${g.files.length} file(s)`);
  }

  // Enrich each group's fallback meta with AI-driven metadata from its reference image
  for (const g of groups) {
    const names = g.files.map((f) => f.base);
    const fallback = inferProductMeta(g.key, names);
    const ref = pickReferenceFile(g.files);
    const manual = labelsByKey.get(g.key);
    // Prefer manual labels over AI and heuristic
    if (manual) {
      const manualMeta = {
        brand: manual.brand || fallback.brand,
        model: manual.name || fallback.model,
        shape: normalizeShape(manual.shape) || fallback.shape,
        style: manual.style || fallback.style,
        color: normalizeColor(manual.color) || fallback.color,
        sex: manual.sex || fallback.sex,
        frameWidthMm: manual.frameWidthMm ?? fallback.frameWidthMm,
        lensHeightMm: manual.lensHeightMm ?? fallback.lensHeightMm,
        priceCents: manual.priceCents ?? fallback.priceCents,
        tags: manual.tags && manual.tags.length ? manual.tags : fallback.tags,
        altText: manual.altText || undefined,
        sku: manual.sku || fallback.sku,
      };
      g.__meta = manualMeta;
    } else {
      const aiMeta = await aiInferMetadata(ref.abs, fallback);
      if (aiMeta) {
        g.__meta = { ...fallback, ...aiMeta };
      } else {
        g.__meta = fallback;
      }
    }
    console.log(`Meta for ${g.key}:`, {
      brand: g.__meta.brand,
      model: g.__meta.model,
      shape: g.__meta.shape,
      color: g.__meta.color,
      style: g.__meta.style,
      sex: g.__meta.sex,
      frameWidthMm: g.__meta.frameWidthMm,
      lensHeightMm: g.__meta.lensHeightMm,
      priceCents: g.__meta.priceCents,
    });
  }

  const url = getDatabaseUrl();
  if (isPostgresUrl(url)) {
    await seedPostgres(groups);
  } else {
    await seedSqlite(groups);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
