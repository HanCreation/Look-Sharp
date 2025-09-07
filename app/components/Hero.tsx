"use client";

import Link from "next/link";
import Image from "next/image";
import React from "react";

export default function Hero() {
  return (
    <section className="relative -mt-24 overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 hero-mesh" />
      {/* Soft ornaments */}
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-brand/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-32 h-80 w-80 rounded-full bg-[rgba(99,102,241,0.25)] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 pb-12 pt-32 md:pb-16 md:pt-56 lg:px-8 xl:pb-24 min-h-[72vh] md:min-h-[82vh]">
        <div className="relative z-10 grid h-full items-center gap-12 md:grid-cols-2">
          {/* Copy */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-gray-700 backdrop-blur">
              <Image src="/logo.png" alt="LookSharp" width={96} height={24} className="h-6 w-auto" priority />
            </div>
            <h1 className="mt-5 text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
              <span className="bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent">Find your</span>
              <br />
              <span className="ls-text-gradient">sharpest look</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg md:text-2xl leading-8 text-gray-700">
            Make your eyes can <span className="text-brand font-semibold">look sharp</span> <br /> and make sure your <span className="text-brand font-semibold">look is sharp</span>.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/browse"
                className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                Browse Frames
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
              >
                Try it now
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><CheckIcon /> No selfie stored</li>
              <li className="flex items-center gap-2"><CheckIcon /> Free to try</li>
            </ul>
          </div>

          {/* Interactive showcase */}
          <div className="hidden md:block md:justify-self-end">
            <TiltCard>
              <div className="relative w-[40vw] max-w-[520px] aspect-square overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
                <Image
                  src="/GirlGlasses.png"
                  alt="Model wearing glasses"
                  fill
                  sizes="(min-width: 768px) 40vw, 0"
                  className="object-cover object-[55%_30%]"
                  priority
                />
                {/* glass sheen */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_60%_0%,rgba(255,255,255,0.65),transparent_60%)]" />
              </div>
            </TiltCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function TiltCard({ children }: { readonly children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<number | null>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const rotateY = (px - 0.5) * 14; // degrees
    const rotateX = (0.5 - py) * 14;
    el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    // smooth reset
    el.style.transition = "transform 300ms ease";
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      if (el) el.style.transition = "";
    }, 320);
  }

  return (
    <div
      ref={ref}
      className="[transform-style:preserve-3d] will-change-transform"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

