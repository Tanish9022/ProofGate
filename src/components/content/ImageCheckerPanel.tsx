'use client';

import { useState } from 'react';
import { ImageOverlay } from './ImageOverlay';

interface Props {
  contentId: string;
  contentVersionId: string;
}

interface FindingResult {
  id?: string;
  kind: string;
  severity: string;
  region_x: number | null;
  region_y: number | null;
  region_w: number | null;
  region_h: number | null;
  explanation: string;
  hex_found?: string | null;
  contrast_ratio?: number | null;
}

export function ImageCheckerPanel({ contentId, contentVersionId }: Props) {
  const [findings, setFindings] = useState<FindingResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Only PNG and JPEG images are supported.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be under 4 MB.');
      return;
    }

    setError(null);
    setLoading(true);
    setFindings(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setImageUrl(dataUrl);

      // Strip the data URL prefix to get raw base64
      const base64 = dataUrl.split(',')[1];

      try {
        const res = await fetch(`/api/content/${contentId}/analyze-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type as 'image/png' | 'image/jpeg',
            contentVersionId,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          setError((err as { error?: string }).error ?? 'Analysis failed');
        } else {
          const data = await res.json() as { findings: FindingResult[] };
          setFindings(data.findings);
        }
      } catch {
        setError('Network error — please try again.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <section
      aria-labelledby="image-check-heading"
      className="mt-6 border border-paper-line rounded-lg p-4 bg-paper-warm"
    >
      <h3
        id="image-check-heading"
        className="text-sm font-semibold text-ink mb-3 flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-accent inline-block" aria-hidden="true" />
        Brand &amp; Accessibility Image Check
      </h3>
      <p className="text-xs text-ink-muted mb-3">
        Upload a PNG or JPEG asset to check it against the approved brand palette and WCAG AA
        contrast thresholds. AI vision locates problem regions; deterministic code verifies the
        result.
      </p>

      <label className="block">
        <span className="sr-only">Upload image for brand check</span>
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFile}
          disabled={loading}
          className="block w-full text-sm text-ink-muted file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-ink file:text-white hover:file:bg-ink/90 cursor-pointer disabled:opacity-50"
        />
      </label>

      {loading && (
        <p className="mt-3 text-sm text-ink-muted animate-pulse" aria-live="polite">
          Analysing image…
        </p>
      )}

      {error && (
        <p
          className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      )}

      {findings !== null && imageUrl && (
        <div className="mt-4">
          <p className="text-xs text-ink-muted mb-2">
            {findings.length === 0
              ? 'No issues found.'
              : `${findings.length} issue${findings.length !== 1 ? 's' : ''} found.`}{' '}
            {findings.some((f) => f.region_x != null) &&
              'Click highlighted regions on the image for details.'}
          </p>
          <ImageOverlay imageUrl={imageUrl} findings={findings} />
        </div>
      )}
    </section>
  );
}

