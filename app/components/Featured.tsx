import Link from "next/link";
import { getRepo } from "@/lib/repo";

export default async function Featured() {
  let items: Array<{ id: string; name: string; brand: string; cover_cdn_url: string | null }>;
  try {
    const repo = await getRepo();
    const res = await repo.listGlasses({ page: 1, limit: 15 } as any);
    items = (res.items || []).map((g: any) => ({ id: g.id, name: g.name, brand: g.brand, cover_cdn_url: g.cover_cdn_url }));
  } catch {
    items = [];
  }
  const row = items.length > 0 ? items : [];
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Sharp look, just for you</h2>

        {row.length > 0 && (
          <div className="relative mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white ring-1 ring-gray-200/60">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent" />
            <div className="ls-marquee-track">
              <div className="ls-marquee group">
                {row.map((g) => (
                  <Card key={g.id} id={g.id} brand={g.brand} name={g.name} cover={g.cover_cdn_url} />
                ))}
                {row.map((g, i) => (
                  <Card key={`${g.id}-dup-${i}`} id={g.id} brand={g.brand} name={g.name} cover={g.cover_cdn_url} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Card({ id, brand, name, cover }: { readonly id: string; readonly brand: string; readonly name: string; readonly cover: string | null }) {
  return (
    <Link
      href={`/glasses/${id}`}
      className="relative mr-5 inline-flex w-[260px] flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-200/60 transition hover:shadow-md hover:ring-gray-300"
    >
      <div className="relative aspect-[4/3] w-full bg-gray-50">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">No image</div>
        )}
      </div>
      <div className="flex h-full flex-col p-3">
        <div className="text-xs font-medium text-brand">{brand}</div>
        <div className="flex-1 flex items-center">
          <div className="whitespace-normal text-sm font-semibold text-gray-900">{name}</div>
        </div>
      </div>
    </Link>
  );
}


