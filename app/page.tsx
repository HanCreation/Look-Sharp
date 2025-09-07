import Hero from './components/Hero';
import QuickTryOn from './components/QuickTryOn';
import Featured from './components/Featured';
import HowItWorks from './components/HowItWorks';
import Link from 'next/link';

// Cache the homepage (including the product carousel) on the CDN
// and regenerate it in the background at most every 10 minutes.
export const revalidate = 600;

export default function Home() {
  return (
    <>
      <Hero />
      <QuickTryOn />
      <Featured />
      <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center">
          <Link
            href="/browse"
            className="inline-flex items-center rounded-full bg-brand px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-brand/90 transition-colors"
          >
            Browse Other Glasses
          </Link>
        </div>
      </div>
    </section>
    </>
  );
}
 
