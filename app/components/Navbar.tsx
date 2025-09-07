"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

export default function Navbar() {
  const router = useRouter();
  const [q, setQ] = React.useState("");

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
        <div className="navbar-card flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 rounded-3xl sm:rounded-full border border-white/50 bg-white/30 px-3 py-2 sm:px-4 sm:py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/30">
          <div className="flex flex-col sm:flex-row flex-1 min-w-0 items-center sm:items-center gap-2 sm:gap-6 w-full">
            <Link href="/" className="hidden md:inline-flex items-center">
              <Image src="/logo.png" alt="LookSharp" width={140} height={32} className="h-6 w-auto" priority />
            </Link>
            <nav className="hidden md:flex items-center ml-6 lg:ml-8 gap-6 lg:gap-8 text-md text-brand/80" aria-label="Primary">
              <Link className="px-3 py-1 rounded-full transition-colors hover:bg-white/50 hover:text-brand" href="/browse">Browse</Link>
              <Link className="px-3 py-1 rounded-full transition-colors hover:bg-white/50 hover:text-brand" href="/tryons">My Try-Ons</Link>
            </nav>
            {/* Mobile bottom-nav links (visible on small screens) */}
            <nav className="flex md:hidden items-center justify-center w-full gap-2 sm:gap-4 text-sm text-brand/80" aria-label="Primary mobile">
              <Link className="px-3 py-2 rounded-full transition-colors hover:bg-white/50 hover:text-brand" href="/">Home</Link>
              <Link className="px-3 py-2 rounded-full transition-colors hover:bg-white/50 hover:text-brand" href="/browse">Browse</Link>
              <Link className="px-3 py-2 rounded-full transition-colors hover:bg-white/50 hover:text-brand" href="/tryons">Try-Ons</Link>
            </nav>
          </div>
          <form className="relative w-full sm:flex-[2] min-w-0 order-3 sm:order-none" onSubmit={onSubmit} role="search" aria-label="Search glasses">
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
        </div>
      </div>
    </div>
  );
}
