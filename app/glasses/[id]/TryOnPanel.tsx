"use client";

import React from "react";

type Props = {
  glasses: {
    id: string;
    brand: string;
    name: string;
    shape?: string | null;
    style?: string | null;
    color?: string | null;
    price_cents?: number | null;
  };
};

export default function TryOnPanel({ glasses }: Props) {
  const [faceFile, setFaceFile] = React.useState<File | null>(null);
  const [facePreviewUrl, setFacePreviewUrl] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!faceFile) return setFacePreviewUrl(null);
    const url = URL.createObjectURL(faceFile);
    setFacePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [faceFile]);

  async function onGenerate() {
    setError(null);
    setResult(null);
    if (!faceFile) {
      setError("Please upload a face photo (JPG/PNG ≤ 10MB)");
      return;
    }
    const form = new FormData();
    form.append("file", faceFile);
    form.append("glassesId", glasses.id);
    form.append("persist", "1");
    setLoading(true);
    try {
      const res = await fetch("/api/tryon", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate");
      const b64 = data.imageBase64 as string;
      const dataUrl = `data:image/png;base64,${b64}`;
      setResult(dataUrl);

      // Save to My Try-Ons with metadata
      try {
        const thumbUrl = await toThumbnail(dataUrl, 768, 0.85).catch(() => dataUrl);
        const key = "looksharp.tryons";
        const prev: any[] = JSON.parse(localStorage.getItem(key) || "[]");
        const id = typeof data.id === 'string' && data.id ? data.id : genLocalId();
        const next = prev.filter((i) => i && i.id !== id);
        next.unshift({
          id,
          createdAt: new Date().toISOString(),
          imageDataUrl: thumbUrl,
          glassesId: glasses.id,
          brand: glasses.brand,
          name: glasses.name,
          shape: glasses.shape ?? undefined,
          style: glasses.style ?? undefined,
          color: glasses.color ?? undefined,
          price_cents: glasses.price_cents ?? undefined,
          source: 'product',
        });
        localStorage.setItem(key, JSON.stringify(next.slice(0, 50)));
      } catch {}
    } catch (err: any) {
      setError(err?.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="tryon" className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-2 font-semibold">Upload your face</div>
        <button
          type="button"
          onClick={() => document.getElementById("face-input")?.click()}
          className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-gray-300"
        >
          {facePreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={facePreviewUrl} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center text-gray-500">
              <div className="text-sm font-medium">Drag & drop image here</div>
              <div className="text-xs">or click to browse</div>
              <div className="mt-2 text-xs text-gray-400">PNG or JPG up to 10MB</div>
            </div>
          )}
          <input
            id="face-input"
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => setFaceFile(e.target.files?.[0] || null)}
          />
        </button>
        <button
          className="mt-6 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
          onClick={onGenerate}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate your look"}
        </button>
        {error && <div className="mt-3 font-medium text-red-700">{error}</div>}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gray-200 min-h-[360px]">
          {result ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="max-h-full max-w-full object-contain" src={result} alt="Generated try-on result" />
          ) : (
            <div className="text-gray-700">Generate to see your new look</div>
          )}
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
              <div className="ls-loader" aria-label="Loading">
                <div className="ls-ring left" />
                <div className="ls-ring right" />
                <div className="ls-bridge" />
                <div className="ls-shine" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helpers shared with QuickTryOn
function genLocalId(): string {
  try {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  } catch {}
  return `ls_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function toThumbnail(srcDataUrl: string, maxDim = 768, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(srcDataUrl);
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve(out);
      } catch (e) {
        resolve(srcDataUrl);
      }
    };
    img.onerror = () => reject(new Error('thumbnail_failed'));
    img.src = srcDataUrl;
  });
}
