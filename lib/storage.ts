import { put } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';

export type UploadResult = { key: string; url: string };

export async function uploadProductAsset(key: string, bytes: Buffer, contentType: string): Promise<UploadResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const res = await put(key, bytes, { access: 'public', contentType, token });
    return { key: res.pathname, url: res.url };
  }
  // Local fallback: write to public/assets and return a relative URL
  const out = path.join(process.cwd(), 'public', key);
  const dir = path.dirname(out);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(out, bytes);
  return { key, url: '/' + key.replace(/\\/g, '/') };
}

