import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
// Postgres is handled via Prisma instead of raw pg
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';

export type Glasses = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  style: string | null;
  shape: string | null;
  glasses_shape: string | null;
  color: string | null;
  sex: 'men' | 'women' | 'unisex' | null;
  frame_width_mm: number | null;
  lens_height_mm: number | null;
  price_cents: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  cover_cdn_url: string | null;
};

export type MediaAsset = {
  id: string;
  glasses_id: string;
  type: 'reference' | 'gallery_image' | 'video';
  storage_key: string | null;
  cdn_url: string | null;
  mime: string | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  checksum: string | null;
  alt_text: string | null;
  sort_order: number | null;
  created_at: string;
};

export type LeadInput = { email: string; glassesId: string; note?: string };

export type TryOnInput = {
  source: 'product' | 'custom';
  imageDataUrl: string;
  glassesId?: string;
  brand?: string;
  name?: string;
  shape?: string | null;
  style?: string | null;
  color?: string | null;
  price_cents?: number | null;
  createdAt?: string; // ISO
};

export type ListParams = {
  query?: string;
  brand?: string;
  style?: string;
  shape?: string;
  page: number;
  limit: number;
  // Optimization: allow callers (e.g., homepage Featured) to skip expensive COUNT(*)
  // When true, implementations should avoid total counts and may return items.length for total.
  skipCount?: boolean;
};

export type Repo = {
  listGlasses(params: ListParams): Promise<{ items: Glasses[]; total: number }>;
  getGlassesById(id: string): Promise<{
    glasses: Glasses;
    assets: MediaAsset[];
  } | null>;
  getReferenceAssetForGlasses(glassesId: string): Promise<{ mime: string; bytes?: Buffer; url?: string } | null>;
  createLead(input: LeadInput): Promise<string>;
  createTryOn(input: TryOnInput): Promise<string>;
};

function ensureSqliteSchema(db: any) {
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
      sex TEXT,
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
      created_at TEXT NOT NULL,
      FOREIGN KEY(glasses_id) REFERENCES glasses(id)
    );
    CREATE INDEX IF NOT EXISTS idx_media_assets_glasses_id ON media_assets(glasses_id);
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      glasses_id TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(glasses_id) REFERENCES glasses(id)
    );
    CREATE TABLE IF NOT EXISTS try_ons (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      image_data_url TEXT NOT NULL,
      glasses_id TEXT,
      brand TEXT,
      name TEXT,
      shape TEXT,
      style TEXT,
      color TEXT,
      price_cents INTEGER,
      created_at TEXT NOT NULL
    );
  `);

  // Migration: add sex column to glasses if missing
  try {
    const cols = db.prepare('PRAGMA table_info(glasses)').all() as Array<{ name: string }>;
    const hasSex = cols.some((c) => c.name === 'sex');
    if (!hasSex) {
      db.exec(`ALTER TABLE glasses ADD COLUMN sex TEXT`);
    }
  } catch (_e) {
    // best-effort; ignore
  }
}

function makeSqliteRepo(): Repo {
  const dataDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  const dbPath = path.join(dataDir, 'dev.sqlite');
  const db = new Database(dbPath);
  ensureSqliteSchema(db);

  return {
    async listGlasses({ query, brand, style, shape, page, limit, skipCount }) {
      const where: string[] = [];
      const params: any[] = [];
      if (query) { where.push('(name LIKE ? OR brand LIKE ? OR sku LIKE ?)'); params.push(`%${query}%`,`%${query}%`,`%${query}%`); }
      if (brand) { where.push('brand = ?'); params.push(brand); }
      if (style) { where.push('style = ?'); params.push(style); }
      if (shape) { where.push('shape = ?'); params.push(shape); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const total = skipCount
        ? 0
        : (db.prepare(`SELECT COUNT(*) as c FROM glasses ${whereSql}`).get(...params).c as number);
      const offset = (page - 1) * limit;
      const itemsRaw = db.prepare(`
        SELECT g.*, (
          SELECT ma.cdn_url FROM media_assets ma WHERE ma.glasses_id = g.id AND ma.type = 'reference' ORDER BY sort_order LIMIT 1
        ) as cover_cdn_url
        FROM glasses g
        ${whereSql}
        ORDER BY g.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as any[];
      const items: Glasses[] = itemsRaw.map(r => ({
        ...r,
        sex: (r.sex as any) ?? null,
        tags: r.tags ? (JSON.parse(r.tags) as string[]) : null,
      }));
      return { items, total: skipCount ? items.length : total };
    },
    async getGlassesById(id: string) {
      const r = db.prepare('SELECT * FROM glasses WHERE id = ?').get(id) as any | undefined;
      if (!r) return null;
      const glasses: Glasses = { ...r, sex: (r.sex as any) ?? null, tags: r.tags ? JSON.parse(r.tags) : null, cover_cdn_url: null };
      const assets = db.prepare('SELECT * FROM media_assets WHERE glasses_id = ? ORDER BY sort_order, created_at').all(id) as any[];
      return { glasses, assets } as any;
    },
    async getReferenceAssetForGlasses(glassesId: string) {
      const r = db.prepare("SELECT * FROM media_assets WHERE glasses_id = ? AND type = 'reference' ORDER BY sort_order LIMIT 1").get(glassesId) as any | undefined;
      if (!r) return null;
      if (r.cdn_url && r.cdn_url.startsWith('/assets/')) {
        const p = path.join(process.cwd(), 'public', r.cdn_url);
        if (fs.existsSync(p)) {
          const bytes = fs.readFileSync(p);
          return { mime: r.mime || 'image/png', bytes };
        }
      }
      return { mime: r.mime || 'image/png', url: r.cdn_url ?? undefined } as any;
    },
    async createLead({ email, glassesId, note }) {
      const id = randomUUID();
      const created_at = new Date().toISOString();
      db.prepare('INSERT INTO leads (id, email, glasses_id, note, created_at) VALUES (?,?,?,?,?)').run(id, email, glassesId, note ?? null, created_at);
      return id;
    },
    async createTryOn(input) {
      const id = randomUUID();
      const created_at = input.createdAt || new Date().toISOString();
      db.prepare(`
        INSERT INTO try_ons (
          id, source, image_data_url, glasses_id, brand, name, shape, style, color, price_cents, created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        id,
        input.source,
        input.imageDataUrl,
        input.glassesId ?? null,
        input.brand ?? null,
        input.name ?? null,
        input.shape ?? null,
        input.style ?? null,
        input.color ?? null,
        input.price_cents ?? null,
        created_at,
      );
      return id;
    },
  };
}

function makePostgresRepo(): Repo {
  return {
    async listGlasses({ query, brand, style, shape, page, limit, skipCount }) {
      const where: any = {};
      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
        ];
      }
      if (brand) where.brand = brand;
      if (style) where.style = style;
      if (shape) where.shape = shape;

      const total = skipCount ? 0 : await prisma.glasses.count({ where });

      const itemsRaw = await prisma.glasses.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assets: {
            where: { type: 'reference' },
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { cdnUrl: true },
          },
        },
      });
      const items: Glasses[] = itemsRaw.map((g: any) => ({
        id: g.id,
        sku: g.sku,
        name: g.name,
        brand: g.brand,
        style: g.style,
        shape: g.shape,
        glasses_shape: g.glassesShape,
        color: g.color,
        sex: (g.sex as any) ?? 'unisex',
        frame_width_mm: g.frameWidthMm,
        lens_height_mm: g.lensHeightMm,
        price_cents: g.priceCents,
        tags: g.tags ?? null,
        created_at: g.createdAt.toISOString(),
        updated_at: g.updatedAt.toISOString(),
        cover_cdn_url: g.assets?.[0]?.cdnUrl ?? null,
      }));
      return { items, total: skipCount ? items.length : total };
    },
    async getGlassesById(id: string) {
      const g = await prisma.glasses.findUnique({
        where: { id },
        include: {
          assets: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        },
      });
      if (!g) return null;
      const glasses: Glasses = {
        id: g.id,
        sku: g.sku,
        name: g.name,
        brand: g.brand,
        style: g.style,
        shape: g.shape,
        glasses_shape: g.glassesShape,
        color: g.color,
        sex: (g.sex as any) ?? 'unisex',
        frame_width_mm: g.frameWidthMm,
        lens_height_mm: g.lensHeightMm,
        price_cents: g.priceCents,
        tags: g.tags ?? null,
        created_at: g.createdAt.toISOString(),
        updated_at: g.updatedAt.toISOString(),
        cover_cdn_url: null,
      };
      const assets: MediaAsset[] = g.assets.map((a: any) => ({
        id: a.id,
        glasses_id: a.glassesId,
        type: a.type,
        storage_key: a.storageKey,
        cdn_url: a.cdnUrl,
        mime: a.mime,
        width: a.width,
        height: a.height,
        duration_ms: a.durationMs,
        checksum: a.checksum,
        alt_text: a.altText,
        sort_order: a.sortOrder,
        created_at: a.createdAt.toISOString(),
      }));
      return { glasses, assets };
    },
    async getReferenceAssetForGlasses(glassesId: string) {
      const r = await prisma.mediaAsset.findFirst({
        where: { glassesId, type: 'reference' },
        orderBy: { sortOrder: 'asc' },
        select: { mime: true, cdnUrl: true },
      });
      if (!r) return null;
      return { mime: r.mime || 'image/png', url: r.cdnUrl ?? undefined } as any;
    },
    async createLead({ email, glassesId, note }) {
      const id = randomUUID();
      await prisma.lead.create({
        data: {
          id,
          email,
          glassesId,
          note: note ?? null,
          createdAt: new Date(),
        },
        select: { id: true },
      });
      return id;
    },
    async createTryOn(input) {
      // Create table if it doesn't exist (raw SQL to avoid updating Prisma schema)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS try_ons (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          image_data_url TEXT NOT NULL,
          glasses_id TEXT,
          brand TEXT,
          name TEXT,
          shape TEXT,
          style TEXT,
          color TEXT,
          price_cents INTEGER,
          created_at TIMESTAMPTZ NOT NULL
        )
      `);
      const id = randomUUID();
      const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
      await prisma.$executeRawUnsafe(
        `INSERT INTO try_ons (id, source, image_data_url, glasses_id, brand, name, shape, style, color, price_cents, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        id,
        input.source,
        input.imageDataUrl,
        input.glassesId ?? null,
        input.brand ?? null,
        input.name ?? null,
        input.shape ?? null,
        input.style ?? null,
        input.color ?? null,
        input.price_cents ?? null,
        createdAt,
      );
      return id;
    },
  };
}

export async function getRepo(): Promise<Repo> {
  // Allow explicit override for local development
  if (String(process.env.FORCE_SQLITE || '').toLowerCase() === 'true' || process.env.FORCE_SQLITE === '1') {
    return makeSqliteRepo();
  }
  const url =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return makePostgresRepo();
  }
  return makeSqliteRepo();
}
