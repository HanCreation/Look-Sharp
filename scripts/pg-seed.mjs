import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Example: postgres://postgres:postgres@localhost:5432/looksharp');
  process.exit(1);
}

function adjustForPgBouncer(u) {
  if (!u) return u;
  try {
    const url = new URL(u);
    const isPooler = url.hostname.includes('pooler.supabase.com') || url.port === '6543';
    if (isPooler && !url.searchParams.has('pgbouncer')) url.searchParams.set('pgbouncer', 'true');
    if (!url.searchParams.has('sslmode')) url.searchParams.set('sslmode', 'require');
    return url.toString();
  } catch { return u; }
}

const prisma = new PrismaClient({ datasources: { db: { url: adjustForPgBouncer(url) } } });

async function main() {
  // NOTE: Ensure schema is applied first (e.g., `npm run prisma:push`).

  // Upsert sample product
  const id1 = '00000000-0000-0000-0000-000000000101';
  const now = new Date();

  await prisma.glasses.upsert({
    where: { id: id1 },
    update: {},
    create: {
      id: id1,
      sku: 'LS-101',
      name: 'Aviator Classic',
      brand: 'LookSharp',
      style: 'classic',
      shape: 'aviator',
      glassesShape: 'aviator',
      color: 'gold',
      sex: 'unisex',
      frameWidthMm: 140,
      lensHeightMm: 48,
      priceCents: 12900,
      tags: ['lightweight', 'best_seller'],
      createdAt: now,
      updatedAt: now,
    },
  });

  // Ensure local ref asset exists for dev
  const refKey = path.posix.join('assets', 'glasses', 'LS-101', 'ref.png');
  const refPublic = path.join(process.cwd(), 'public', refKey);
  if (!fs.existsSync(path.dirname(refPublic))) fs.mkdirSync(path.dirname(refPublic), { recursive: true });
  const placeholder = path.join(process.cwd(), 'HeroBackground.png');
  if (fs.existsSync(placeholder) && !fs.existsSync(refPublic)) {
    fs.copyFileSync(placeholder, refPublic);
  }

  await prisma.mediaAsset.upsert({
    where: { id: '00000000-0000-0000-0000-000000001001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000001001',
      glassesId: id1,
      type: 'reference',
      storageKey: refKey,
      cdnUrl: '/' + refKey.replace(/\\/g, '/'),
      mime: 'image/png',
      width: null,
      height: null,
      durationMs: null,
      checksum: null,
      altText: 'Reference image for Aviator Classic',
      sortOrder: 0,
      createdAt: now,
    },
  });

  console.log('Postgres seed complete (Prisma)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
