import { PrismaClient } from '@prisma/client';

// Ensure a single PrismaClient in dev (Next.js hot-reload safe)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Support Vercel + Supabase env conventions in addition to DATABASE_URL
const databaseUrl =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  '';

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
