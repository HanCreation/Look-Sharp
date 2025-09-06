"use client";

import Link from 'next/link';
import React from 'react';

type Item = {
  id: string;
  createdAt: string;
  imageDataUrl: string;
  glassesId?: string;
  brand?: string;
  name?: string;
  shape?: string | null;
  style?: string | null;
  color?: string | null;
  price_cents?: number | null;
  source?: 'product' | 'custom';
};

export default function TryOnsPage() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [lightboxItem, setLightboxItem] = React.useState<Item | null>(null);

  React.useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('looksharp.tryons') || '[]');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    }
  }, []);

  React.useEffect(() => {
    if (!lightboxItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxItem(null);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxItem]);

  function remove(id: string) {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    localStorage.setItem('looksharp.tryons', JSON.stringify(next));
  }

  return (
    <section className="bg-white py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Try-Ons</h1>
          <button
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => {
              if (confirm('Clear all saved try-ons?')) {
                localStorage.removeItem('looksharp.tryons');
                setItems([]);
              }
            }}
          >
            Clear all
          </button>
        </div>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-600">
            No saved try-ons yet. Generate one on the home page or a product page.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <article key={it.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div
                  className="relative aspect-square w-full bg-gray-100 cursor-zoom-in"
                  title="Click to view larger"
                  onClick={() => setLightboxItem(it)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.imageDataUrl} alt="Saved try-on" className="h-full w-full object-cover" />
                </div>
                <div className="p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="truncate text-gray-700">
                      {it.brand && it.name ? (
                        <>
                          <span className="font-medium text-brand">{it.brand}</span> {it.name}
                        </>
                      ) : (
                        <span>Custom try-on</span>
                      )}
                    </div>
                    <div className="text-gray-500">{new Date(it.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {it.glassesId ? (
                      <Link href={`/glasses/${it.glassesId}`} className="text-brand hover:underline">
                        View product
                      </Link>
                    ) : (
                      <div />
                    )}
                    <div className="space-x-2">
                      <a
                        href={it.imageDataUrl}
                        download={`looksharp-tryon-${it.id}.${it.imageDataUrl?.startsWith('data:image/jpeg') ? 'jpg' : 'png'}`}
                        className="rounded-full border border-gray-300 bg-white px-3 py-1 text-gray-700 hover:bg-gray-50"
                      >
                        Download
                      </a>
                      <button
                        className="rounded-full bg-red-50 px-3 py-1 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                        onClick={() => remove(it.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged try-on preview"
          onClick={() => setLightboxItem(null)}
        >
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              className="relative max-h-full max-w-5xl rounded-2xl bg-brand/60 p-2 shadow-2xl ring-2 ring-brand/60 backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxItem.imageDataUrl}
                alt="Try-on preview"
                className="max-h-[85vh] rounded-xl"
              />
              <div className="mt-2 rounded-xl bg-white/60 p-4 text-sm text-gray-800 ring-1 ring-white/50 backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    {lightboxItem.brand && lightboxItem.name ? (
                      <div className="truncate"><span className="font-semibold text-gray-900">{lightboxItem.brand}</span> {lightboxItem.name}</div>
                    ) : (
                      <div className="font-medium text-gray-900">Custom try-on</div>
                    )}
                    <div className="mt-0.5 text-gray-700 truncate">
                      {(lightboxItem.shape || lightboxItem.style || lightboxItem.color) ? (
                        <>
                          {lightboxItem.shape && <span className="mr-2">{lightboxItem.shape}</span>}
                          {lightboxItem.style && <span className="mr-2">{lightboxItem.style}</span>}
                          {lightboxItem.color && <span className="mr-2">{lightboxItem.color}</span>}
                        </>
                      ) : (
                        <span>{lightboxItem.source === 'custom' ? 'Uploaded glasses reference' : '—'}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-gray-700 shrink-0">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Saved</div>
                    <div className="text-sm">{new Date(lightboxItem.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                {lightboxItem.glassesId && (
                  <div className="mt-3 flex items-center justify-between">
                    <Link href={`/glasses/${lightboxItem.glassesId}`} className="text-brand hover:underline">
                      View product details
                    </Link>
                    {typeof lightboxItem.price_cents === 'number' && (
                      <div className="text-sm font-medium text-gray-900">${(lightboxItem.price_cents / 100).toFixed(2)}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute right-3 top-3 flex gap-2">
                <a
                  href={lightboxItem.imageDataUrl}
                  download={`looksharp-tryon-${lightboxItem.id}.${lightboxItem.imageDataUrl?.startsWith('data:image/jpeg') ? 'jpg' : 'png'}`}
                  className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-900 shadow ring-1 ring-white/60 transition hover:bg-white"
                  aria-label="Download image"
                  title="Download"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 12 12 16.5m0 0L16.5 12M12 16.5V3" />
                  </svg>
                  <span className="sr-only">Download</span>
                </a>
                <button
                  className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-900 shadow ring-1 ring-white/60 transition hover:bg-white"
                  onClick={() => setLightboxItem(null)}
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
        </div>
      )}
    </section>
  );
}
