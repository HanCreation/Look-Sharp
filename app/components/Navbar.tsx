"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { createPortal } from "react-dom";

export default function Navbar() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [apiModalOpen, setApiModalOpen] = React.useState(false);
  const [apiKeyInput, setApiKeyInput] = React.useState("");
  const [hasKey, setHasKey] = React.useState(false);

  React.useEffect(() => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem('looksharp_gemini_api_key') : '';
      if (v) {
        setHasKey(true);
        setApiKeyInput(v);
      }
    } catch {}
  }, []);

  // Dynamically measure bottom navbar height on small screens and expose as CSS var
  React.useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)') : null;

    const updateBottomNavHeight = () => {
      const isBottomNav = !!mq?.matches;
      if (!isBottomNav) {
        document.documentElement.style.removeProperty('--bottom-navbar-height');
        return;
      }
      const nav = document.getElementById('site-navbar');
      if (!nav) return;
      const heightWithBuffer = nav.offsetHeight + 8; // small buffer for shadows/borders
      document.documentElement.style.setProperty('--bottom-navbar-height', `${heightWithBuffer}px`);
    };

    // Observe size changes of the navbar itself (content wraps, virtual keyboard, etc.)
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      const nav = document.getElementById('site-navbar');
      if (nav) {
        ro = new ResizeObserver(() => updateBottomNavHeight());
        ro.observe(nav);
      }
    }

    updateBottomNavHeight();
    mq?.addEventListener?.('change', updateBottomNavHeight as EventListener);
    window.addEventListener('resize', updateBottomNavHeight);
    window.addEventListener('orientationchange', updateBottomNavHeight as any);

    return () => {
      ro?.disconnect();
      mq?.removeEventListener?.('change', updateBottomNavHeight as EventListener);
      window.removeEventListener('resize', updateBottomNavHeight);
      window.removeEventListener('orientationchange', updateBottomNavHeight as any);
    };
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse");
  }

  return (
    <div id="site-navbar" className="fixed top-4 left-0 right-0 z-40 px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="navbar-card flex flex-col md:grid md:grid-cols-[auto_1fr_auto] md:items-center gap-3 md:gap-6 rounded-3xl md:rounded-full border border-white/50 bg-white/30 px-3 py-2 sm:px-4 sm:py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/30">
          <div className="flex flex-col md:flex-row md:flex-none min-w-0 items-center md:items-center gap-2 md:gap-6 w-full">
            <Link href="/" className="hidden md:inline-flex items-center">
              <Image src="/logo.png" alt="LookSharp" width={140} height={32} className="h-6 w-auto" priority />
            </Link>
            <nav className="hidden md:flex items-center ml-6 lg:ml-8 gap-6 lg:gap-8 text-md text-brand/80" aria-label="Primary">
              <Link className="px-3 py-1 rounded-full transition-colors hover:bg-white/50 hover:text-brand whitespace-nowrap" href="/browse">Browse</Link>
              <Link className="px-3 py-1 rounded-full transition-colors text-center hover:bg-white/50 hover:text-brand whitespace-nowrap" href="/tryons">My Try-Ons</Link>
            </nav>
            {/* Mobile bottom-nav links with API Key button (visible on small screens) */}
            <nav className="flex md:hidden items-center w-full gap-2 sm:gap-4 text-sm text-brand/80" aria-label="Primary mobile">
              <div className="flex items-center gap-2 sm:gap-4">
                <Link className="px-3 py-2 rounded-full transition-colors hover:bg-white/50 hover:text-brand" href="/">Home</Link>
                <Link className="px-3 py-2 rounded-full transition-colors hover:bg-white/50 hover:text-brand" href="/browse">Browse</Link>
                <Link className="px-3 py-2 rounded-full transition-colors hover:bg-white/50 hover:text-brand" href="/tryons">Try-Ons</Link>
              </div>
              <button
                type="button"
                onClick={() => setApiModalOpen(true)}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm font-medium text-gray-800 shadow ring-1 ring-gray-200 transition hover:bg-white"
                aria-haspopup="dialog"
                aria-expanded={apiModalOpen ? 'true' : 'false'}
                title={hasKey ? 'Update API Key' : 'Set API Key'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={hasKey ? 'text-green-600' : 'text-gray-600'}>
                  <path d="M21 2l-2 2m0 0l-3.5 3.5M19 4l-3.5 3.5M7 15l-4 4v3h3l4-4m-3-3l9-9m-9 9l3 3m6-12l3 3" />
                </svg>
                {hasKey ? 'API Key: Set' : 'Set API Key'}
              </button>
            </nav>
          </div>
          <form className="relative hidden md:block w-full md:max-w-xl lg:max-w-2xl min-w-0 md:justify-self-center order-3 md:order-none" onSubmit={onSubmit} role="search" aria-label="Search glasses">
            <input
              className="h-11 sm:h-12 w-full rounded-full border-0 bg-white/40 px-4 sm:px-5 pr-10 sm:pr-12 text-base text-gray-800 placeholder:text-gray-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ring-1 ring-white/60 outline-none backdrop-blur focus:ring-2 focus:ring-brand"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search glasses..."
              aria-label="Search glasses"
            />
            <button className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 shadow ring-1 ring-gray-200 transition hover:bg-white" aria-label="Search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </form>
          {/* API Key Button (desktop) */}
          <div className="hidden md:flex items-center justify-end sm:ml-2 shrink-0">
            <button
              type="button"
              onClick={() => setApiModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm font-medium text-gray-800 shadow ring-1 ring-gray-200 transition hover:bg-white"
              aria-haspopup="dialog"
              aria-expanded={apiModalOpen ? 'true' : 'false'}
              title={hasKey ? 'Update API Key' : 'Set API Key'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={hasKey ? 'text-green-600' : 'text-gray-600'}>
                <path d="M21 2l-2 2m0 0l-3.5 3.5M19 4l-3.5 3.5M7 15l-4 4v3h3l4-4m-3-3l9-9m-9 9l3 3m6-12l3 3" />
              </svg>
              {hasKey ? 'API Key: Set' : 'Set API Key'}
            </button>
          </div>
          {apiModalOpen && (
            <ApiKeyModal
              value={apiKeyInput}
              onChange={setApiKeyInput}
              onClose={() => setApiModalOpen(false)}
              onSave={() => {
                try {
                  const v = apiKeyInput.trim();
                  if (v) {
                    window.localStorage.setItem('looksharp_gemini_api_key', v);
                    setHasKey(true);
                  } else {
                    window.localStorage.removeItem('looksharp_gemini_api_key');
                    setHasKey(false);
                  }
                } catch {}
                setApiModalOpen(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ApiKeyModal({ value, onChange, onClose, onSave }: { value: string; onChange: (v: string) => void; onClose: () => void; onSave: () => void }) {
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Set API Key" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 text-lg font-semibold text-gray-900">Use your own Gemini API key</div>
        
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="gemini-key-input">GEMINI_API_KEY</label>
          <input
            id="gemini-key-input"
            type="password"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="AIza..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          <div className="mt-2 rounded-md bg-gray-50 p-2 text-xs text-gray-600 ring-1 ring-gray-200">
            Privacy note: your key is stored only in your browser (localStorage). It is not saved on our servers. If you leave it blank, the app uses the server’s configured key when available.
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={onSave} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90">Save</button>
          </div>
      </div>
    </div>,
    document.body
  );
}
