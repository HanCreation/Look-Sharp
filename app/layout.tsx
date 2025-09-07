import './globals.css';
import type { ReactNode } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'LookSharp',
  description: 'AI glasses <try-></try->on and product browser',
  icons: {
    icon: '/thumb.png',
  },
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased flex flex-col">
        <Navbar />
        <main id="site-main" className="pt-24 md:pt-24 pt-[calc(var(--bottom-navbar-height,72px)+8px)] pb-32 flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
