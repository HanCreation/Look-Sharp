"use client";

import React from "react";
import { createPortal } from "react-dom";
import { saveTryOnToDB } from "@/lib/indexeddb";
import { toThumbnail } from "@/lib/client-image";
import { MAX_UPLOAD_MB, MAX_UPLOAD_BYTES, ALLOWED_MIME } from "@/lib/upload-constraints";

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
  referenceUrl?: string | null;
};

export default function TryOnPanel({ glasses, referenceUrl }: Props) {
  const [faceFile, setFaceFile] = React.useState<File | null>(null);
  const [facePreviewUrl, setFacePreviewUrl] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);

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
      setError(`Please upload a face photo (JPG/PNG ≤ ${MAX_UPLOAD_MB}MB)`);
      return;
    }
    const form = new FormData();
    form.append("file", faceFile);
    form.append("glassesId", glasses.id);
    if (referenceUrl) form.append('glassesUrl', referenceUrl);
    // No server persistence; saving happens in browser storage
    setLoading(true);
    try {
      const res = await fetch("/api/tryon", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate");
      const b64 = data.imageBase64 as string;
      const dataUrl = `data:image/png;base64,${b64}`;
      setResult(dataUrl);

      // Save to My Try-Ons (IndexedDB) with product metadata
      try {
        const thumbUrl = await toThumbnail(dataUrl, 768, 0.85).catch(() => dataUrl);
        await saveTryOnToDB(thumbUrl, {
          source: 'product',
          createdAt: new Date().toISOString(),
          glassesId: glasses.id,
          brand: glasses.brand,
          name: glasses.name,
          shape: glasses.shape ?? undefined,
          style: glasses.style ?? undefined,
          color: glasses.color ?? undefined,
          price_cents: glasses.price_cents ?? undefined,
        });
      } catch {}
    } catch (err: any) {
      setError(err?.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  function onFileSelected(f: File | null) {
    if (!f) {
      setFaceFile(null);
      setResult(null);
      return;
    }
    const mime = (f.type || '').toLowerCase();
    if (!ALLOWED_MIME.includes(mime)) { setError('Only JPEG or PNG supported'); return; }
    if (f.size > MAX_UPLOAD_BYTES) { setError(`File too large. Max ${MAX_UPLOAD_MB}MB`); return; }
    setError(null);
    setFaceFile(f);
    setResult(null);
    try { if (fileInputRef.current) fileInputRef.current.value = ''; } catch {}
  }

  function onDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (faceFile) return; // require discard before replacing
    const f = e.dataTransfer.files?.[0] || null;
    onFileSelected(f);
  }

  function onDragOver(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (faceFile) return;
    setIsDragOver(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  return (
    <div id="tryon" className="flex flex-col gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Virtual try-on</div>
        <div className="mb-2 text-lg font-semibold text-gray-900">Upload your face</div>
        <button
          type="button"
          onClick={() => { if (!faceFile) document.getElementById("face-input")?.click(); }}
          onDrop={(e) => onDrop(e)}
          onDragOver={(e) => onDragOver(e)}
          onDragLeave={(e) => onDragLeave(e)}
          className={
            "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-gradient-to-b from-gray-50 to-white transition " +
            (isDragOver ? "border-brand ring-2 ring-brand/50 " : "border-gray-200 hover:border-gray-300 ") +
            (faceFile ? "cursor-default" : "cursor-pointer")
          }
          aria-label="Upload image dropzone"
        >
          {facePreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <>
              <img src={facePreviewUrl} alt="preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFaceFile(null);
                  setFacePreviewUrl(null);
                  setResult(null);
                  setError(null);
                  try { if (fileInputRef.current) fileInputRef.current.value = ''; } catch {}
                }}
                className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-black/5 hover:bg-white"
                aria-label="Remove image"
              >
                Discard
              </button>
            </>
          ) : (
            <div className="text-center text-gray-500">
              <div className="text-sm font-medium">Drag & drop image here</div>
              <div className="text-xs">or click to browse</div>
              <div className="mt-2 text-xs text-gray-400">PNG or JPG up to {MAX_UPLOAD_MB}MB</div>
            </div>
          )}
          <input
            id="face-input"
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
          />
        </button>
        {/* Reset button removed; discard is available on the face upload */}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div
          className={
            "relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gray-200 min-h-[360px] " +
            (loading ? "opacity-90 pointer-events-none " : "cursor-pointer hover:ring-2 hover:ring-brand/60 ")
          }
          role="button"
          tabIndex={0}
          aria-label={loading ? "Generating your look" : (result ? "View enlarged try-on" : "Click to see your new look")}
          onClick={() => { if (!loading) { if (result) setLightboxOpen(true); else onGenerate(); } }}
          onKeyDown={(e) => { if (!loading && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (result) setLightboxOpen(true); else onGenerate(); } }}
        >
          {error && (
            <div className="absolute top-0 inset-x-0 z-20 flex justify-center pointer-events-none">
              <div className="m-3 rounded-md bg-red-100 px-3 py-2 text-red-700 font-medium ring-1 ring-red-300 shadow-sm">
                {error}
              </div>
            </div>
          )}
          {result ? (
            // eslint-disable-next-line @next/next/no-img-element
            <>
              <img className="max-h-full max-w-full object-contain" src={result} alt="Generated try-on result" />
              <button
                type="button"
                className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-black/5 hover:bg-white"
                onClick={(e) => { e.stopPropagation(); if (!loading) onGenerate(); }}
                aria-label="Regenerate look"
                title="Regenerate"
              >
                Regenerate
              </button>
            </>
          ) : (
            <div className="text-gray-700">Click to see your new look</div>
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
        {/* Footnote about Google usage */}
        <div className="mt-4 flex items-center">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            <svg className="w-3 h-3 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Your uploaded images may be used by Google to improve their AI models and services
          </div>
        </div>
      </div>
      {result && (
        <Lightbox open={lightboxOpen} src={result} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}

// No local helpers; shared utilities are imported

function Lightbox({ open, src, onClose }: { open: boolean; src: string; onClose: () => void }) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged try-on preview"
      onClick={onClose}
    >
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative max-h-full max-w-5xl rounded-2xl bg-brand/60 p-2 shadow-2xl ring-2 ring-brand/60 backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <img src={src} alt="Try-on preview" className="max-h-[85vh] rounded-xl" />
          <div className="pointer-events-none absolute right-3 top-3">
            <button
              className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-900 shadow ring-1 ring-white/60 transition hover:bg-white"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
