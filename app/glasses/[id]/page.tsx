import TryOnPanel from './TryOnPanel';
import Link from 'next/link';
import LeadForm from './LeadForm';
import { getRepo } from '@/lib/repo';

type PageProps = { params: { id: string } };

async function getData(id: string) {
  const repo = await getRepo();
  const item = await repo.getGlassesById(id);
  if (!item) return null;
  return item as any;
}

export default async function GlassesDetail({ params }: PageProps) {
  const data = await getData(params.id);
  if (!data) {
    return (
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-600">
            Not found
          </div>
        </div>
      </section>
    );
  }

  const { glasses, assets } = data;
  const gallery = assets.filter((a) => a.cdn_url && (a.type === 'gallery_image' || a.type === 'reference'));
  const cover = gallery[0];
  const thumbs = gallery.slice(1, 6);
  const shape = glasses.shape || glasses.glasses_shape;

  const specs: Array<{ label: string; value: string | number } | null> = [
    { label: 'SKU', value: glasses.sku },
    shape ? { label: 'Shape', value: shape } : null,
    glasses.style ? { label: 'Style', value: glasses.style } : null,
    glasses.color ? { label: 'Color', value: glasses.color } : null,
    glasses.sex ? { label: 'Sex', value: String(glasses.sex) } : null,
    glasses.frame_width_mm != null ? { label: 'Frame width', value: `${glasses.frame_width_mm} mm` } : null,
    glasses.lens_height_mm != null ? { label: 'Lens height', value: `${glasses.lens_height_mm} mm` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string | number }>;

  return (
    <section className="bg-white py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-10">
          {/* Left column: product info, gallery, specs, lead form */}
          <div className="col-span-12 lg:col-span-7 xl:col-span-8">
            <div className="mb-4">
              <Link href="/browse" className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Back to Browse
              </Link>
            </div>
            <div className="mb-2 text-sm font-medium text-brand">{glasses.brand}</div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{glasses.name}</h1>
            <div className="mt-2 text-sm text-gray-600">{shape || '—'} • {glasses.color || '—'}</div>
            {glasses.price_cents != null && (
              <div className="mt-3 text-2xl font-semibold text-gray-900">${(glasses.price_cents / 100).toFixed(2)}</div>
            )}

            {/* Gallery */}
            <div className="mt-6">
              {gallery.length ? (
                <div className="space-y-3">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover.cdn_url!}
                      alt={cover.alt_text || ''}
                      className="aspect-[4/3] w-full rounded-2xl bg-gray-100 object-contain shadow-sm"
                    />
                  )}
                  {thumbs.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
                      {thumbs.map((a) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={a.id}
                          src={a.cdn_url!}
                          alt={a.alt_text || ''}
                          className="aspect-square w-full rounded-xl object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-gray-100 p-10 text-center text-gray-500">No images yet</div>
              )}
            </div>

            {/* Specs */}
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 text-lg font-semibold text-gray-900">Specs</div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {specs.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <dt className="text-sm text-gray-600">{s.label}</dt>
                    <dd className="text-sm font-medium text-gray-900">{String(s.value)}</dd>
                  </div>
                ))}
              </dl>
              {Array.isArray(glasses.tags) && glasses.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {glasses.tags.map((t: string, i: number) => (
                    <span key={`${t}-${i}`} className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Lead form */}
            {/* <LeadForm glassesId={glasses.id} /> */}
          </div>

          {/* Right column: sticky try-on panel */}
          <div className="col-span-12 lg:col-span-5 xl:col-span-4">
            <div className="lg:sticky lg:top-24">
              <TryOnPanel
                glasses={{
                  id: glasses.id,
                  brand: glasses.brand,
                  name: glasses.name,
                  shape: glasses.shape,
                  style: glasses.style,
                  color: glasses.color,
                  price_cents: glasses.price_cents,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
