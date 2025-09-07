import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { generateTryOn } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || '10');

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const glassesIdField = form.get('glassesId');
    const glassesId = typeof glassesIdField === 'string' ? glassesIdField : '';
    const glassesFile = form.get('glassesFile');

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    // If client uploads a glasses reference image, we'll use it; otherwise require an id.

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_UPLOAD_MB) {
      return NextResponse.json({ error: `File too large. Max ${MAX_UPLOAD_MB}MB` }, { status: 413 });
    }
    const mime = (file.type || '').toLowerCase();
    if (!(mime === 'image/jpeg' || mime === 'image/png')) {
      return NextResponse.json({ error: 'Only JPEG or PNG supported' }, { status: 415 });
    }

    let reference: { mime: string; bytes?: Buffer; url?: string };
    if (glassesFile instanceof Blob) {
      const gfSize = glassesFile.size / (1024 * 1024);
      if (gfSize > MAX_UPLOAD_MB) {
        return NextResponse.json({ error: `Glasses file too large. Max ${MAX_UPLOAD_MB}MB` }, { status: 413 });
      }
      const gfMime = (glassesFile.type || '').toLowerCase();
      if (!(gfMime === 'image/jpeg' || gfMime === 'image/png')) {
        return NextResponse.json({ error: 'Glasses image must be JPEG or PNG' }, { status: 415 });
      }
      const bytes = Buffer.from(await glassesFile.arrayBuffer());
      reference = { mime: gfMime, bytes };
    } else {
      if (!glassesId) {
        return NextResponse.json({ error: 'Missing glasses reference (upload or id)' }, { status: 400 });
      }
      const repo = await getRepo();
      const fetched = await repo.getReferenceAssetForGlasses(glassesId);
      if (!fetched) {
        return NextResponse.json({ error: 'No reference asset for glasses' }, { status: 400 });
      }
      reference = fetched as any;
      if (!reference.bytes && reference.url) {
        try {
          const resp = await fetch(reference.url);
          if (!resp.ok) throw new Error(`fetch_failed_${resp.status}`);
          const ab = await resp.arrayBuffer();
          const mimeFromResp = resp.headers.get('content-type') || reference.mime || 'image/png';
          reference = { mime: mimeFromResp, bytes: Buffer.from(ab) };
        } catch (e) {
          return NextResponse.json({ error: 'Failed to load reference image' }, { status: 502 });
        }
      }
    }

    const selfieBytes = Buffer.from(await file.arrayBuffer());

    const prompt = `Edit the provided image to make the person's wear the glasses provided in other image. Make sure you retain all the same elements and detail in the original image except you edit/add new glasses to the face. Preserve the background, clothes, and other elements in the original image + Preserve the glasses' brand color, frame shape. Do not add text or watermarks.\n\nComposite these glasses naturally onto the face: align to eye centers, scale to typical PD (62mm ±10%), respect head tilt ±15°. Output a single 1024x1024 PNG. No extra artifacts.`;
    
    const started = Date.now();
    const { imageBase64, modelId } = await generateTryOn({
      selfie: { mime, bytes: selfieBytes },
      reference,
      prompt,
    });
    const elapsedMs = Date.now() - started;

    const res = NextResponse.json({ imageBase64, modelId, elapsedMs }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err: any) {
    console.error('tryon error', err?.message || err);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 502 });
  }
}
