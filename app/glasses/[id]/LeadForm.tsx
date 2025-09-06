"use client";

import React from 'react';

export default function LeadForm({ glassesId }: { glassesId: string }) {
  const [email, setEmail] = React.useState('');
  const [note, setNote] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, glassesId, note: note || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to submit');
      setStatus('ok');
      setMessage('Thanks! We will be in touch.');
      setEmail('');
      setNote('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message || 'Failed to submit');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 text-lg font-semibold text-gray-900">Get updates on this frame</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-800 placeholder:text-gray-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note"
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-800 placeholder:text-gray-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand md:col-span-2"
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          disabled={status === 'loading'}
          className="inline-flex items-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
        >
          {status === 'loading' ? 'Submitting...' : 'Notify me'}
        </button>
        {message && (
          <div className={status === 'ok' ? 'text-green-700' : 'text-red-700'}>
            {message}
          </div>
        )}
      </div>
    </form>
  );
}

