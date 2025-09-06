"use client";

import Link from "next/link";
import Image from "next/image";
import React from "react";

export default function Hero() {
  return (
    <section className="relative -mt-24 overflow-hidden bg-[url('/HeroBackground.png')] bg-cover bg-center">
      <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-28 md:pb-14 md:pt-52 lg:px-8 xl:pb-20 min-h-[72vh] md:min-h-[82vh]">
        <div className="relative z-10 grid h-full items-center gap-12 md:grid-cols-2">
          <div className="max-w-3xl">
            {/* <div className="inline-block rounded-full bg-brand/10 px-4 py-1 text-sm font-semibold text-brand ring-1 ring-brand/20">LookSharp</div> */}
            <div className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-6xl">
              {/* <span className="text-brand">Look</span>Sharp */}
              <Image src="/logo.png" alt="LookSharp" width={420} height={96} className="h-16 w-auto" priority />
            </div>
            <p className="mt-4 max-w-xl text-xl leading-7 text-gray-700 md:text-3xl">
              Make your eyes can <span className="text-brand font-semibold">look sharp</span> <br /> and make sure your <span className="text-brand font-semibold">look is sharp</span>.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/browse"
                className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <p className="text-lg">Browse Frames to Try on with AI</p>
              </Link>
              {/* <Link
                href="/browse"
                className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
              >
                Browse
              </Link> */}
            </div>
          </div>
          <div className="hidden md:block md:justify-self-end">
            <div className="relative w-[40vw] max-w-[520px] aspect-square overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5">
              <Image
                src="/GirlGlasses.png"
                alt=""
                fill
                sizes="(min-width: 768px) 40vw, 0"
                className="object-cover object-[55%_30%]"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


