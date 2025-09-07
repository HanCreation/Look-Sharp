import { PrismaClient } from '@prisma/client';

// Ensure a single PrismaClient in dev (Next.js hot-reload safe)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Support Vercel + Supabase env conventions in addition to DATABASE_URL
function adjustForPgBouncer(u?: string) {
  if (!u) return '';
  try {
    const url = new URL(u);
    // Always disable prepared statements for maximum compatibility with poolers (e.g., PgBouncer)
    if (!url.searchParams.has('pgbouncer')) url.searchParams.set('pgbouncer', 'true');
    // Limit connections to prevent prepared statement conflicts
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '1');
    // Keep SSL required by default when not explicitly set (helps with hosted Postgres providers)
    if (!url.searchParams.has('sslmode')) url.searchParams.set('sslmode', 'require');
    return url.toString();
  } catch {
    return u;
  }
}

const rawDatabaseUrl =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  '';
const databaseUrl = adjustForPgBouncer(rawDatabaseUrl);

const prismaClient =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // If provided, explicitly pass the datasource URL so Prisma can connect
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient;
}
