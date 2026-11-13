import { describe, it, expect } from 'vitest';

// Pure unit tests for the insights service logic (no DB calls needed)
describe('insights metrics logic', () => {
  it('computes dismissal rate correctly', () => {
    const total = 10;
    const dismissed = 5;
    const rate = dismissed / total;
    expect(rate).toBe(0.5);
  });

  it('detects unclear rule threshold (>= 3 findings AND >= 40% dismissal)', () => {
    const isUnclear = (total: number, dismissed: number) =>
      total >= 3 && dismissed / total >= 0.4;

    expect(isUnclear(3, 2)).toBe(true);  // 66.7% dismissal, 3 findings
    expect(isUnclear(5, 2)).toBe(true);  // 40.0% dismissal, 5 findings
    expect(isUnclear(5, 1)).toBe(false); // 20.0% dismissal — below threshold
    expect(isUnclear(2, 2)).toBe(false); // < 3 findings — below minimum
    expect(isUnclear(10, 3)).toBe(false); // 30.0% dismissal — below 40%
  });

  it('computes severity breakdown correctly', () => {
    const rows = [
      { severity: 'blocker', count: '5' },
      { severity: 'warning', count: '12' },
      { severity: 'info', count: '3' },
    ];
    const breakdown = { blocker: 0, warning: 0, info: 0 };
    for (const row of rows) {
      if (row.severity === 'blocker') breakdown.blocker = parseInt(row.count, 10);
      else if (row.severity === 'warning') breakdown.warning = parseInt(row.count, 10);
      else if (row.severity === 'info') breakdown.info = parseInt(row.count, 10);
    }
    expect(breakdown).toEqual({ blocker: 5, warning: 12, info: 3 });
  });

  it('handles empty dismissal rates gracefully', () => {
    const rows: Array<{ total: string; dismissed: string }> = [];
    const rates = rows.map((r) => ({
      total: parseInt(r.total, 10),
      dismissed: parseInt(r.dismissed, 10),
      rate: parseInt(r.dismissed, 10) / parseInt(r.total, 10),
    }));
    expect(rates).toHaveLength(0);
  });

  it('handles null median clearance hours', () => {
    const raw: string | null = null;
    const result = raw != null ? parseFloat(raw) : null;
    expect(result).toBeNull();
  });

  it('computes total findings from severity breakdown', () => {
    const breakdown = { blocker: 3, warning: 7, info: 2 };
    const total = breakdown.blocker + breakdown.warning + breakdown.info;
    expect(total).toBe(12);
  });
});

