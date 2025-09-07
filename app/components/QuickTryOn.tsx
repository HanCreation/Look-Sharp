"use client";

import React from "react";
import { createPortal } from "react-dom";
import { saveTryOnToDB } from "@/lib/indexeddb";
import { toThumbnail } from "@/lib/client-image";

export default function QuickTryOn() {
  const [faceFile, setFaceFile] = React.useState<File | null>(null);
  const [glassesFile, setGlassesFile] = React.useState<File | null>(null);
  const [facePreviewUrl, setFacePreviewUrl] = React.useState<string | null>(null);
  const [glassesPreviewUrl, setGlassesPreviewUrl] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  React.useEffect(() => {
    // Create object URLs for previews; clean up on change/unmount
    if (faceFile) {
      const url = URL.createObjectURL(faceFile);
      setFacePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFacePreviewUrl(null);
    }
  }, [faceFile]);

  React.useEffect(() => {
    if (glassesFile) {
      const url = URL.createObjectURL(glassesFile);
      setGlassesPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setGlassesPreviewUrl(null);
    }
  }, [glassesFile]);

  async function onGenerate() {
    setError(null);
    setResult(null);
    if (!faceFile) {
      setError("Please upload a face photo (JPG/PNG ≤ 10MB)");
      return;
    }
    if (!glassesFile) {
      setError("Please upload a glasses reference image (JPG/PNG ≤ 10MB)");
      return;
    }
    const form = new FormData();
    form.append("file", faceFile);
    form.append("glassesFile", glassesFile);
    // Server does not persist try-on images; storage is browser-only
    setLoading(true);
    try {
      const res = await fetch("/api/tryon", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate");
      const b64 = data.imageBase64 as string;
      const dataUrl = `data:image/png;base64,${b64}`;
      setResult(dataUrl);

      // Save to My Try-Ons (IndexedDB, with compression)
      try {
        const thumbUrl = await toThumbnail(dataUrl, 768, 0.85).catch(() => dataUrl);
        await saveTryOnToDB(thumbUrl, {
          source: 'custom',
          createdAt: new Date().toISOString(),
        });
      } catch {}
    } catch (err: any) {
      setError(err?.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="how-it-works" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 className="mb-6 text-3xl font-semibold tracking-tight text-gray-900">Quick Try On</h2>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <div className="grid grid-cols-1 gap-6">
                <UploadCard
                  title="Upload your face"
                  subtitle="PNG or JPG up to 10MB • Front-facing works best"
                  file={faceFile}
                  previewUrl={facePreviewUrl}
                  setFile={setFaceFile}
                  fit="cover"
                />
                <UploadCard
                  title="Upload glasses image"
                  subtitle="Transparent background works best"
                  file={glassesFile}
                  previewUrl={glassesPreviewUrl}
                  setFile={setGlassesFile}
                  fit="contain"
                />
              </div>
            </div>
            <div className="lg:col-span-2 flex flex-col justify-center min-h-[72vh]">
              <div
                className={
                  "relative mx-auto flex w-full max-w-3xl items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-gray-50 min-h-[360px] md:min-h-[460px] lg:min-h-[520px] " +
                  (loading ? "border-gray-200 opacity-90 pointer-events-none " : "border-gray-200 hover:border-brand cursor-pointer ")
                }
                role="button"
                tabIndex={0}
                aria-label={loading ? "Generating your look" : (result ? "View enlarged try-on" : "Click to see your new look")}
                onClick={() => { if (!loading) { if (result) setLightboxOpen(true); else onGenerate(); } }}
                onKeyDown={(e) => { if (!loading && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (result) setLightboxOpen(true); else onGenerate(); } }}
              >
                {result ? (
                  <>
                    <img className="absolute inset-0 h-full w-full object-cover" src={result} alt="Generated try-on result" />
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-gray-500 text-base md:text-lg">Click to see your new look</div>
                  </div>
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
                {error && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50/80">
                    <div className="rounded-md bg-red-100 px-4 py-2 text-red-700 font-medium ring-1 ring-red-300">
                      {error}
                    </div>
                  </div>
                )}
              </div>
              {/* Placeholder acts as the generate trigger; button removed */}
              {/* Footnote about Google usage */}
              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  <svg className="w-3 h-3 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Your uploaded images may be used by Google to improve their AI models and services
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {result && (
        <Lightbox open={lightboxOpen} src={result} onClose={() => setLightboxOpen(false)} />
      )}
    </section>
  );
}

type UploadCardProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly file: File | null;
  readonly previewUrl: string | null;
  readonly setFile: (f: File | null) => void;
  readonly fit?: "cover" | "contain";
};

function UploadCard(props: UploadCardProps) {
  const { title, subtitle, file, previewUrl, setFile, fit = "contain" } = props;
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function onFileSelected(f: File | null) {
    if (!f) return setFile(null);
    const mime = (f.type || "").toLowerCase();
    if (!(mime === "image/png" || mime === "image/jpeg")) return;
    setFile(f);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    onFileSelected(e.target.files?.[0] || null);
    // Allow selecting the same file again by clearing the input value
    try {
      // Using currentTarget ensures we reference the input reliably in React
      (e.currentTarget as HTMLInputElement).value = "";
    } catch {}
  }

  function onDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelected(f);
  }

  function onDragOver(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  return (
    <div className="flex flex-col">
      <div className="mb-2 font-semibold">{title}</div>
      <button
        className={
          "group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-gray-50 transition " +
          (isDragOver ? "border-brand bg-brand/5 " : "border-gray-200 hover:border-gray-300 ") +
          (!file ? "cursor-pointer" : "cursor-default")
        }
        onDrop={(e) => {
          if (file) {
            e.preventDefault();
            e.stopPropagation();
            return; // require discard before replacing
          }
          onDrop(e);
        }}
        onDragOver={(e) => {
          if (file) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onDragOver(e);
        }}
        onDragLeave={(e) => {
          if (file) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onDragLeave(e);
        }}
        aria-label="Upload image dropzone"
        type="button"
        onClick={() => { if (!file) inputRef.current?.click(); }}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="preview" className={"h-full w-full " + (fit === "cover" ? "object-cover" : "object-contain")} />
            <button
              type="button"
              onClick={(e) => {
                // Prevent triggering the parent button (which opens file picker)
                e.preventDefault();
                e.stopPropagation();
                setFile(null);
                // Also clear the hidden input so re-uploading the same file works
                if (inputRef.current) {
                  try { inputRef.current.value = ""; } catch {}
                }
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
            {subtitle && <div className="mt-2 text-xs text-gray-400">{subtitle}</div>}
          </div>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
          onChange={onInputChange}
          ref={inputRef}
        />
      </button>
      {file && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <span className="truncate">{file.name}</span>
          
        </div>
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
