import { z } from 'zod';

export const createSourceSchema = z.object({
  kind: z.enum(['fact', 'term', 'guideline', 'asset']),
  key: z.string().min(1).regex(/^[a-z0-9_]+$/, 'Key must be alphanumeric snake_case'),
  title: z.string().min(1).max(200),
  owner: z.string().min(1).max(100),
  value: z.record(z.string(), z.unknown()),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const addVersionSchema = z.object({
  value: z.record(z.string(), z.unknown()),
  changeNote: z.string().max(500).optional(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const withdrawSchema = z.object({
  reason: z.string().min(1, 'Withdrawal reason is required').max(500),
});

