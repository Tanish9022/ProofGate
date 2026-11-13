import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  isApprovedColour,
  computeRelativeLuminance,
} from '../src/server/services/imageChecker';

describe('imageChecker — deterministic functions', () => {
  it('computes contrast ratio for black on white (should be 21:1)', () => {
    const ratio = contrastRatio('#000000', '#ffffff');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('computes contrast ratio for grey #767676 on white (WCAG AA boundary ~4.5:1)', () => {
    const ratio = contrastRatio('#767676', '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.4);
    expect(ratio).toBeLessThanOrEqual(4.6);
  });

  it('detects approved colour within tolerance', () => {
    const approved = ['#1a56db'];
    expect(isApprovedColour('#1a56db', approved, 30)).toBe(true);
    // 1 unit off in blue channel — still within tolerance 30
    expect(isApprovedColour('#1a56dc', approved, 30)).toBe(true);
  });

  it('rejects colour outside tolerance', () => {
    const approved = ['#1a56db'];
    expect(isApprovedColour('#ff0000', approved, 30)).toBe(false);
  });

  it('computes relative luminance for white (#ffffff = 1.0)', () => {
    expect(computeRelativeLuminance('#ffffff')).toBeCloseTo(1.0, 2);
  });

  it('computes relative luminance for black (#000000 = 0.0)', () => {
    expect(computeRelativeLuminance('#000000')).toBeCloseTo(0.0, 2);
  });

  it('contrastRatio is commutative', () => {
    const r1 = contrastRatio('#1a56db', '#ffffff');
    const r2 = contrastRatio('#ffffff', '#1a56db');
    expect(r1).toBeCloseTo(r2, 5);
  });
});

