import './globals.css';
import type { ReactNode } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export const metadata = {
  title: 'LookSharp',
  description: 'AI glasses try-on and product browser',
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased flex flex-col">
        <Navbar />
        <main className="pt-24 pb-16 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
