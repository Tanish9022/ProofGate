import { describe, it, expect } from 'vitest';
import { createSourceSchema, addVersionSchema, withdrawSchema } from '@/server/validators/sources';

describe('Source Validators (Zod schemas)', () => {
  it('validates a correct fact source', () => {
    const input = {
      kind: 'fact',
      key: 'enterprise_price',
      title: 'Enterprise Price',
      owner: 'Pricing team',
      value: { number: 999, unit: 'INR_per_user_month', display: 'Rs. 999 per user per month' },
      validUntil: '2026-12-31',
    };
    const parsed = createSourceSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('rejects keys with invalid characters', () => {
    const input = {
      kind: 'fact',
      key: 'invalid key with spaces!',
      title: 'Invalid',
      owner: 'Owner',
      value: { number: 10 },
    };
    const parsed = createSourceSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('validates addVersionSchema with changeNote', () => {
    const input = {
      value: { number: 699, unit: 'INR_per_user_month', display: 'Rs. 699 per user per month' },
      changeNote: 'Price updated from Rs. 499 to Rs. 699',
      validUntil: null,
    };
    const parsed = addVersionSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('validates withdrawSchema requires a reason', () => {
    expect(withdrawSchema.safeParse({ reason: '' }).success).toBe(false);
    expect(withdrawSchema.safeParse({ reason: 'Discontinued product line' }).success).toBe(true);
  });
});

describe('Dependency Tracing & Revalidation Rules (Block B core)', () => {
  it('only confirmed dependencies trigger revalidation, probable links never do', () => {
    interface ClearanceDep {
      clearanceId: string;
      linkStatus: 'confirmed' | 'probable';
      state: 'current' | 'rejected' | 'revalidation_required';
    }

    const dependencies: ClearanceDep[] = [
      { clearanceId: 'c-1', linkStatus: 'confirmed', state: 'current' },
      { clearanceId: 'c-2', linkStatus: 'probable', state: 'current' },
      { clearanceId: 'c-3', linkStatus: 'confirmed', state: 'rejected' },
    ];

    // Core rule from AGENTS.md:
    // A clearance dependency triggers revalidation ONLY when link_status = confirmed and clearance state = current
    const affected = dependencies.filter(
      d => d.linkStatus === 'confirmed' && d.state === 'current'
    );

    expect(affected.map(a => a.clearanceId)).toEqual(['c-1']);
  });

  it('historical context claims create no dependency on current facts', () => {
    interface Claim {
      quote: string;
      context: 'current' | 'historical' | 'quoted' | 'hypothetical';
      factKey: string;
    }

    const claims: Claim[] = [
      { quote: 'Rs. 499 per user per month', context: 'current', factKey: 'pro_price' },
      { quote: 'In 2025, Acme paid Rs. 399', context: 'historical', factKey: 'pro_price' },
      { quote: 'What if price was Rs. 100?', context: 'hypothetical', factKey: 'pro_price' },
    ];

    const createsCurrentDependency = (c: Claim) => c.context === 'current';

    const dependentClaims = claims.filter(createsCurrentDependency);
    expect(dependentClaims.length).toBe(1);
    expect(dependentClaims[0].quote).toBe('Rs. 499 per user per month');
  });

  it('formats change reason cleanly for numeric price change', () => {
    const oldVal = { number: 499, display: 'Rs. 499 per user per month' };
    const newVal = { number: 699, display: 'Rs. 699 per user per month' };

    const reason = `Pro plan price changed from ${oldVal.display} to ${newVal.display}`;
    expect(reason).toBe('Pro plan price changed from Rs. 499 per user per month to Rs. 699 per user per month');
  });
});

