import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRepo } from '@/lib/repo';

export const dynamic = 'force-dynamic';

const LeadSchema = z.object({
  email: z.string().email(),
  glassesId: z.string().min(1),
  note: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  const repo = await getRepo();
  const id = await repo.createLead(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}

