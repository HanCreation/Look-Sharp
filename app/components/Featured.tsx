import Link from "next/link";

export default function Featured() {
  const chips = [
    { label: "Aviator", query: "shape=aviator" },
    { label: "Round", query: "shape=round" },
    { label: "Rectangular", query: "shape=rectangular" },
  ];
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 className="mb-3 text-2xl font-semibold text-gray-900">Sharp Look Just For You</h2>
        <div className="flex flex-wrap gap-3">
          {chips.map((c) => (
            <Link
              className="inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              key={c.label}
              href={`/browse?${c.query}`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}


