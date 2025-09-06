"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

export default function Navbar() {
  const router = useRouter();
  const [q, setQ] = React.useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse");
  }

  return (
    <div className="fixed top-4 left-0 right-0 z-40 px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-6 rounded-full border border-white/50 bg-white/30 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/30">
          <div className="flex flex-1 min-w-0 items-center gap-6">
            <Link href="/" className="inline-flex items-center">
              <Image src="/logo.png" alt="LookSharp" width={140} height={32} className="h-6 w-auto" priority />
            </Link>
            <nav className="hidden md:flex items-center ml-6 lg:ml-8 gap-6 lg:gap-8 text-md text-brand/80" aria-label="Primary">
              <Link className="px-3 py-1 rounded-full transition-colors hover:bg-white/50 hover:text-brand" href="/browse">Browse</Link>
              <Link className="px-3 py-1 rounded-full transition-colors hover:bg-white/50 hover:text-brand" href="/tryons">My Try-Ons</Link>
            </nav>
          </div>
          <form className="relative flex-[2] min-w-0" onSubmit={onSubmit} role="search" aria-label="Search glasses">
            <input
              className="h-12 w-full rounded-full border-0 bg-white/40 px-5 pr-12 text-base text-gray-800 placeholder:text-gray-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ring-1 ring-white/60 outline-none backdrop-blur focus:ring-2 focus:ring-brand"
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

