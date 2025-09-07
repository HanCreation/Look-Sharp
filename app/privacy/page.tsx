export default function Privacy() {
  return (
    <section className="bg-white py-8 md:py-12">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">Privacy</h1>
        <p className="mb-4 text-gray-700">
          We do not store your selfies or generated try-on images on our servers. Your images are sent to the AI model provider for the purpose of generating your try-on preview. AI model provider may train on your sent data. Saved try-ons in “My Try-Ons” are stored only in your browser on your device.
        </p>
        <p className="mb-4 text-gray-700">
          Product data (e.g., frames and reference images) may be loaded from our database or a CDN to render the
          browsing and product pages.
        </p>
      </div>
    </section>
  );
}
