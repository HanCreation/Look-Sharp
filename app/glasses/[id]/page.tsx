import TryOnPanel from './TryOnPanel';
import LeadForm from './LeadForm';

type PageProps = { params: { id: string } };

async function getData(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/glasses/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json() as Promise<{
    glasses: {
      id: string;
      sku: string;
      name: string;
      brand: string;
      style: string | null;
      shape: string | null;
      color: string | null;
      frame_width_mm: number | null;
      lens_height_mm: number | null;
      price_cents: number | null;
      tags: string[] | null;
    };
    assets: Array<{
      id: string;
      type: string;
      cdn_url: string | null;
      alt_text: string | null;
      width: number | null;
      height: number | null;
    }>;
  }>;
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

  return (
    <section className="bg-white py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <div className="mb-3 text-sm font-medium text-brand">{glasses.brand}</div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{glasses.name}</h1>
            <div className="mt-2 text-sm text-gray-600">{glasses.shape || '—'} • {glasses.color || '—'}</div>
            {glasses.price_cents != null && (
              <div className="mt-4 text-2xl font-semibold text-gray-900">${(glasses.price_cents / 100).toFixed(2)}</div>
            )}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {gallery.length ? (
                gallery.map((a) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={a.id} src={a.cdn_url!} alt={a.alt_text || ''} className="aspect-square w-full rounded-xl object-cover" />
                ))
              ) : (
                <div className="col-span-3 rounded-xl bg-gray-100 p-10 text-center text-gray-500">No images yet</div>
              )}
            </div>
            <LeadForm glassesId={glasses.id} />
          </div>
          <div>
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
    </section>
  );
}
