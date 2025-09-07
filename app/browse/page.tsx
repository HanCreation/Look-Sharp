import Link from 'next/link';
import { getRepo } from '@/lib/repo';

type SearchParams = Readonly<{
  q?: string;
  brand?: string;
  style?: string;
  shape?: string;
  page?: string;
}>;

type Glasses = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  style: string | null;
  shape: string | null;
  color: string | null;
  sex: string | null;
  tags: string[] | null;
  cover_cdn_url: string | null;
};

async function getData(searchParams: SearchParams) {
  try {
    const repo = await getRepo();
    const page = Math.max(1, Number(searchParams.page || '1'));
    const limit = 12;
    const { items, total } = await repo.listGlasses({
      query: searchParams.q,
      brand: searchParams.brand,
      style: searchParams.style,
      shape: searchParams.shape?.replace('rectangular', 'rectangle') || undefined,
      page,
      limit,
    });
    return { items: items as any as Glasses[], total, page, limit };
  } catch (error) {
    console.error('Failed to load glasses via repo:', error);
    return { items: [], total: 0, page: 1, limit: 12 };
  }
}

export default async function Browse({ searchParams }: { readonly searchParams: SearchParams }) {
  const data = await getData(searchParams);
  const { items, total, page, limit } = data || { items: [], total: 0, page: 1, limit: 12 };
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const shapes = [
    { label: 'All', value: '' },
    { label: 'Aviator', value: 'aviator' },
    { label: 'Round', value: 'round' },
    { label: 'Rectangular', value: 'rectangle' },
  ];

  function buildHref(params: Partial<SearchParams>) {
    const sp = new URLSearchParams();
    const q = params.q ?? searchParams.q ?? '';
    const brand = params.brand ?? searchParams.brand ?? '';
    const style = params.style ?? searchParams.style ?? '';
    const shape = params.shape ?? searchParams.shape ?? '';
    const p = params.page ?? (params.shape !== undefined || params.q !== undefined ? '1' : searchParams.page ?? '1');
    if (q) sp.set('q', q);
    if (brand) sp.set('brand', brand);
    if (style) sp.set('style', style);
    if (shape) sp.set('shape', shape);
    if (p) sp.set('page', p);
    const qs = sp.toString();
    return qs ? `/browse?${qs}` : '/browse';
  }

  return (
    <section className="bg-white py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Browse Frames</h1>
        </div>

        {/* Mobile search */}
        <form action="/browse" method="GET" className="md:hidden mb-4">
          <label className="sr-only" htmlFor="browse-q">Search</label>
          <div className="relative">
            <input
              id="browse-q"
              name="q"
              defaultValue={searchParams.q || ''}
              placeholder="Search glasses..."
              className="h-11 w-full rounded-full border-0 bg-white px-4 pr-10 text-base text-gray-800 placeholder:text-gray-500 shadow ring-1 ring-gray-200 focus:ring-2 focus:ring-brand"
            />
            <button className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 shadow ring-1 ring-gray-200" aria-label="Search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        </form>

        <div className="mb-6 -mx-1 overflow-x-auto md:overflow-visible">
          <div className="flex md:flex-wrap items-center gap-2 px-1 whitespace-nowrap">
          {shapes.map((s) => {
            const active = (searchParams.shape || '') === s.value;
            return (
              <Link
                key={s.label}
                href={buildHref({ shape: s.value, page: '1' })}
                className={
                  'inline-flex items-center rounded-full px-4 py-2 text-sm shadow-sm ring-1 transition ' +
                  (active
                    ? 'bg-brand text-white ring-brand'
                    : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50')
                }
              >
                {s.label}
              </Link>
            );
          })}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <div className="text-gray-600">
              {(() => {
                if (total === 0 && (searchParams.q || searchParams.shape)) {
                  return (
                    <div>
                      <p className="text-lg font-medium mb-2">No results found</p>
                      <p className="text-sm">Try adjusting your search terms or filters.</p>
                    </div>
                  );
                } else if (total === 0) {
                  return (
                    <div>
                      <p className="text-lg font-medium mb-2">No frames available</p>
                      <p className="text-sm">Check back later for new arrivals.</p>
                    </div>
                  );
                } else {
                  return (
                    <div>
                      <p className="text-lg font-medium mb-2">Unable to load frames</p>
                      <p className="text-sm">Please try refreshing the page.</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((g) => (
              <article
                key={g.id}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white/70 shadow-sm ring-1 ring-gray-200/60 backdrop-blur transition hover:shadow-md hover:ring-gray-300"
              >
                <div className="relative aspect-[4/3] w-full bg-gray-50">
                  {g.cover_cdn_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.cover_cdn_url}
                      alt=""
                      className="h-full w-full object-contain p-4 transition-transform duration-300 will-change-transform"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-1 text-sm font-medium text-brand">{g.brand}</div>
                  <h3 className="truncate text-lg font-semibold text-gray-900">{g.name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                    <span className="truncate">{g.shape || '—'}</span>
                    {g.sex && <span className="text-gray-500">• {g.sex}</span>}
                    {(() => {
                      const tags = (g.tags || []).map(t => t.toLowerCase());
                      const isSun = tags.some(t => t.includes('sunglass') || t === 'sun');
                      const isOptical = tags.some(t => t.includes('eyeglass') || t.includes('optical'));
                      const label = isSun ? 'sunglasses' : (isOptical ? 'eyeglasses' : null);
                      return label ? <span className="text-gray-500">• {label}</span> : null;
                    })()}
                  </div>
                  <div className="mt-4 flex items-center justify-end">
                    <Link
                      href={`/glasses/${g.id}#tryon`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand/90 hover:shadow-md"
                      aria-label="Try on"
                      title="Try on"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z" />
                      </svg>
                      <span className="sr-only">Try on</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const active = p === page;
              return (
                <Link
                  key={p}
                  href={buildHref({ page: String(p) })}
                  className={
                    'h-10 w-10 rounded-full text-center text-sm leading-10 ring-1 transition ' +
                    (active ? 'bg-brand text-white ring-brand' : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50')
                  }
                >
                  {p}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
