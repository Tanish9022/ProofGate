'use client';

import { useMemo } from 'react';
import { FindingRow } from '@/server/services/content';

interface HighlightedTextProps {
  text: string;
  findings: FindingRow[];
  selectedFindingId?: string | null;
  onSelectFinding?: (id: string) => void;
}

interface Span {
  start: number;
  end: number;
  finding?: FindingRow;
  text: string;
}

export function HighlightedText({
  text,
  findings,
  selectedFindingId,
  onSelectFinding,
}: HighlightedTextProps) {
  const spans = useMemo(() => {
    // 1. Gather valid spans
    const intervals: Array<{ start: number; end: number; finding: FindingRow }> = [];

    for (const f of findings) {
      let start = f.start_idx;
      let end = f.end_idx;

      // Fallback search if index is missing or out of bounds
      if (start < 0 || end > text.length || text.slice(start, end) !== f.quote) {
        const found = text.indexOf(f.quote);
        if (found !== -1) {
          start = found;
          end = found + f.quote.length;
        } else {
          continue;
        }
      }

      intervals.push({ start, end, finding: f });
    }

    // Sort by start index
    intervals.sort((a, b) => a.start - b.start);

    // Filter overlapping spans: keep the blocker or first one
    const nonOverlapping: Array<{ start: number; end: number; finding: FindingRow }> = [];
    let lastEnd = 0;
    for (const item of intervals) {
      if (item.start >= lastEnd) {
        nonOverlapping.push(item);
        lastEnd = item.end;
      }
    }

    // Build the full sequence of plain text and highlighted spans
    const result: Span[] = [];
    let cursor = 0;
    for (const item of nonOverlapping) {
      if (item.start > cursor) {
        result.push({
          start: cursor,
          end: item.start,
          text: text.slice(cursor, item.start),
        });
      }
      result.push({
        start: item.start,
        end: item.end,
        finding: item.finding,
        text: text.slice(item.start, item.end),
      });
      cursor = item.end;
    }

    if (cursor < text.length) {
      result.push({
        start: cursor,
        end: text.length,
        text: text.slice(cursor),
      });
    }

    return result;
  }, [text, findings]);

  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
      {spans.map((s, idx) => {
        if (!s.finding) {
          return <span key={idx}>{s.text}</span>;
        }

        const f = s.finding;
        const isSelected = f.id === selectedFindingId;

        const styleClass = {
          blocker: 'bg-red-pen-light/80 text-red-pen underline decoration-red-pen decoration-2 decoration-wavy',
          warning: 'bg-amber-light/80 text-amber underline decoration-amber decoration-2 decoration-dashed',
          info: 'bg-verdigris-light/60 text-verdigris underline decoration-verdigris decoration-1',
        }[f.severity];

        return (
          <mark
            key={idx}
            onClick={() => onSelectFinding?.(f.id)}
            title={`Finding: ${f.explanation}`}
            className={[
              'cursor-pointer rounded px-0.5 py-0.5 transition-all duration-120 font-medium',
              styleClass,
              isSelected ? 'ring-2 ring-indigo ring-offset-1 font-semibold' : 'hover:opacity-80',
            ].join(' ')}
          >
            {s.text}
          </mark>
        );
      })}
    </div>
  );
}

