'use client';

import { useState } from 'react';

export function ResetDemoButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const reset = async () => {
    if (!confirm('This clears your demo data and starts again. Continue?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/workspace/reset', { method: 'POST' });
      if (res.ok) {
        setDone(true);
        setTimeout(() => { window.location.href = '/'; }, 800);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={reset}
      disabled={loading}
      className="rounded border border-line-strong px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-red-pen hover:text-red-pen disabled:opacity-50"
      aria-label="Reset demo data"
    >
      {done ? 'Resetting…' : loading ? 'Resetting…' : 'Reset demo'}
    </button>
  );
}
