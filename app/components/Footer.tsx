import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30"></div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-32 h-32 bg-gradient-to-br from-brand/5 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-gradient-to-br from-blue-100/50 to-transparent rounded-full blur-2xl"></div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-3 items-start">
          {/* Brand section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="LookSharp" width={120} height={28} className="h-7 w-auto" />
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
              <span className="text-sm font-medium text-gray-600">AI Glasses Try-On</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              Make your eyes look sharp and ensure your look is sharp with our AI-powered try-on. No selfies stored.
            </p>
          </div>

          {/* Links section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Explore</h3>
            <div className="space-y-3">
              <Link
                href="/browse"
                className="group flex items-center gap-2 text-sm text-gray-600 hover:text-brand transition-colors duration-200"
              >
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Browse Frames
              </Link>
              <Link
                href="/tryons"
                className="group flex items-center gap-2 text-sm text-gray-600 hover:text-brand transition-colors duration-200"
              >
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                My Try-Ons
              </Link>
              <Link
                href="/privacy"
                className="group flex items-center gap-2 text-sm text-gray-600 hover:text-brand transition-colors duration-200"
              >
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Trust & tech info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Trust & Technology</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    No server storage of your selfies or results
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2 2a1 1 0 000 2h8a1 1 0 100-2H5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Powered by Google Gemini 2.5 Flash Image Generation
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 011.414 1.414L8.414 9.5H5a1 1 0 100 2h3.414l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Your uploaded images may be used by Google to improve their AI models and services
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-8 pt-6 border-t border-gray-200/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">Made with ❤️ for the Nano Banana Hackathon</p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">© 2025 @HanCreation x PutraGPT</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-brand to-blue-500"></div>
                <span className="text-xs text-gray-500">Powered by Google AI Studio</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


