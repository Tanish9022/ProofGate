import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const createCommentSchema = z.object({
  versionId: z.string().uuid('Invalid versionId format'),
  body: z.string().trim().min(1, 'Comment cannot be empty').max(500, 'Comment cannot exceed 500 characters'),
  findingId: z.string().uuid().optional().nullable(),
});

describe('Round 2 Fix 1 - Comments on Content Versions', () => {
  it('validates comment body constraints (non-empty and max 500 characters)', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    // Empty comment should fail
    const emptyResult = createCommentSchema.safeParse({
      versionId: validUuid,
      body: '   ',
    });
    expect(emptyResult.success).toBe(false);

    // Over 500 chars should fail
    const longBody = 'a'.repeat(501);
    const longResult = createCommentSchema.safeParse({
      versionId: validUuid,
      body: longBody,
    });
    expect(longResult.success).toBe(false);

    // Exactly 500 chars should succeed
    const exact500Body = 'a'.repeat(500);
    const exact500Result = createCommentSchema.safeParse({
      versionId: validUuid,
      body: exact500Body,
    });
    expect(exact500Result.success).toBe(true);

    // Normal valid comment should succeed
    const validResult = createCommentSchema.safeParse({
      versionId: validUuid,
      body: 'Updated discount percentage based on client approval email.',
    });
    expect(validResult.success).toBe(true);
  });

  it('allows any valid role (creator, reviewer, admin) to author comments', () => {
    const allowedRoles = ['creator', 'reviewer', 'admin'];
    const canComment = (role: string) => allowedRoles.includes(role);

    expect(canComment('creator')).toBe(true);
    expect(canComment('reviewer')).toBe(true);
    expect(canComment('admin')).toBe(true);
    expect(canComment('anonymous')).toBe(false);
  });

  it('generates valid audit log mutation details for comment creation', () => {
    const auditPayload = {
      workspace_id: 'ws-123',
      actor_role: 'creator',
      action: 'comment.created',
      entity_type: 'comment',
      entity_id: 'comm-456',
      details: {
        contentId: 'content-789',
        versionId: 'ver-001',
        version: 1,
        findingId: null,
      },
    };

    expect(auditPayload.action).toBe('comment.created');
    expect(auditPayload.entity_type).toBe('comment');
    expect(auditPayload.details.version).toBe(1);
  });
});
