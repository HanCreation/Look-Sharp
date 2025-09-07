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
  price_cents: number | null;
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

        <div className="mb-6 flex flex-wrap items-center gap-2">
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
                <div className="relative aspect-[4/3] w-full bg-gray-100">
                  {g.cover_cdn_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.cover_cdn_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 will-change-transform group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">No image</div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/5 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                <div className="p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-medium text-brand">{g.brand}</div>
                    {g.price_cents != null && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-900">
                        ${((g.price_cents || 0) / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <h3 className="truncate text-lg font-semibold text-gray-900">{g.name}</h3>
                  <div className="mt-1 text-sm text-gray-600">{g.shape || '—'}</div>
                  <div className="mt-4 flex items-center justify-between">
                    <Link href={`/glasses/${g.id}`} className="text-sm font-medium text-brand transition hover:underline">
                      View details
                    </Link>
                    <Link
                      href={`/glasses/${g.id}#tryon`}
                      className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand/90 hover:shadow-md"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M10 2c-2.21 0-4 1.79-4 4v2H4a2 2 0 00-2 2v3a3 3 0 003 3h10a3 3 0 003-3v-3a2 2 0 00-2-2h-2V6c0-2.21-1.79-4-4-4zm-2 6V6a2 2 0 114 0v2H8z" />
                      </svg>
                      <span>Try on</span>
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
