'use client';

import { useState } from 'react';

interface RegionFinding {
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

interface Props {
  imageUrl: string;
  findings: RegionFinding[];
}

const SEVERITY_COLOURS: Record<string, string> = {
  blocker: '#dc2626',
  warning: '#d97706',
  info: '#6b7280',
};

const KIND_LABELS: Record<string, string> = {
  palette_off_brand: 'Off-brand colour',
  contrast_below_aa: 'Low contrast',
  logo_missing: 'Logo issue',
  text_unreadable: 'Text unclear',
};

export function ImageOverlay({ imageUrl, findings }: Props) {
  const [selected, setSelected] = useState<RegionFinding | null>(null);

  const withRegions = findings.filter(
    (f) => f.region_x != null && f.region_y != null && f.region_w != null && f.region_h != null
  );
  const withoutRegions = findings.filter((f) => f.region_x == null);

  return (
    <div className="space-y-4">
      {/* Image with SVG overlay */}
      <div className="relative inline-block max-w-full border border-paper-line rounded overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Uploaded image for brand check" className="block max-w-full" />
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {withRegions.map((f, i) => {
            const colour = SEVERITY_COLOURS[f.severity] ?? '#6b7280';
            return (
              <g
                key={i}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(f === selected ? null : f)}
                role="button"
                tabIndex={0}
                aria-label={KIND_LABELS[f.kind] ?? f.kind}
              >
                <rect
                  x={f.region_x!}
                  y={f.region_y!}
                  width={f.region_w!}
                  height={f.region_h!}
                  fill={colour + '33'}
                  stroke={colour}
                  strokeWidth="0.004"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected region detail */}
      {selected && (
        <div className="p-3 bg-paper-warm border border-paper-line rounded text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className={[
                  'inline-block px-2 py-0.5 rounded text-xs font-mono font-bold mr-2',
                  selected.severity === 'blocker'
                    ? 'bg-red-100 text-red-800'
                    : selected.severity === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-700',
                ].join(' ')}
              >
                {selected.severity.toUpperCase()}
              </span>
              <span className="font-medium text-ink">{KIND_LABELS[selected.kind] ?? selected.kind}</span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-ink-muted hover:text-ink text-xs"
              aria-label="Close detail"
            >
              ✕
            </button>
          </div>
          <p className="mt-1.5 text-ink-muted">{selected.explanation}</p>
          {selected.hex_found && (
            <p className="mt-1 text-xs font-mono text-ink-muted">
              Colour:{' '}
              <span
                style={{
                  background: selected.hex_found,
                  padding: '0 6px',
                  borderRadius: 2,
                  border: '1px solid #ccc',
                }}
              >
                &nbsp;
              </span>{' '}
              {selected.hex_found}
              {selected.contrast_ratio != null && (
                <> · Contrast: {selected.contrast_ratio.toFixed(2)}:1 (need ≥4.5)</>
              )}
            </p>
          )}
        </div>
      )}

      {/* Non-regional findings */}
      {withoutRegions.length > 0 && (
        <ul className="space-y-1" aria-label="Image findings">
          {withoutRegions.map((f, i) => (
            <li
              key={i}
              className="text-sm text-ink-muted border border-paper-line rounded px-3 py-2"
            >
              <span
                className={[
                  'inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold mr-2',
                  f.severity === 'blocker'
                    ? 'bg-red-100 text-red-800'
                    : f.severity === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-700',
                ].join(' ')}
              >
                {f.severity.toUpperCase()}
              </span>
              {f.explanation}
            </li>
          ))}
        </ul>
      )}

      {findings.length === 0 && (
        <p className="text-sm text-emerald-700 font-medium">
          ✓ No brand or accessibility issues detected.
        </p>
      )}
    </div>
  );
}

