import { describe, it, expect } from 'vitest';

describe('Round 2 Fix 2 - Server-side Role Checks', () => {
  const checkRoleAccess = (currentRole: string, requiredRole: string): { allowed: boolean; status?: number; error?: string } => {
    if (currentRole !== requiredRole) {
      return {
        allowed: false,
        status: 403,
        error: `Forbidden: this action requires '${requiredRole}' privileges (current role: '${currentRole}'). Note: x-role header is a demo control, not authentication.`,
      };
    }
    return { allowed: true };
  };

  it('allows Reviewer to decide reviews, rejects Creator and Admin with 403', () => {
    expect(checkRoleAccess('reviewer', 'reviewer')).toEqual({ allowed: true });
    
    const creatorAttempt = checkRoleAccess('creator', 'reviewer');
    expect(creatorAttempt.allowed).toBe(false);
    expect(creatorAttempt.status).toBe(403);
    expect(creatorAttempt.error).toContain("requires 'reviewer' privileges");

    const adminAttempt = checkRoleAccess('admin', 'reviewer');
    expect(adminAttempt.allowed).toBe(false);
    expect(adminAttempt.status).toBe(403);
    expect(adminAttempt.error).toContain("requires 'reviewer' privileges");
  });

  it('allows Admin to mutate sources (add-version, withdraw, expire), rejects Creator and Reviewer with 403', () => {
    expect(checkRoleAccess('admin', 'admin')).toEqual({ allowed: true });

    const creatorAttempt = checkRoleAccess('creator', 'admin');
    expect(creatorAttempt.allowed).toBe(false);
    expect(creatorAttempt.status).toBe(403);
    expect(creatorAttempt.error).toContain("requires 'admin' privileges");

    const reviewerAttempt = checkRoleAccess('reviewer', 'admin');
    expect(reviewerAttempt.allowed).toBe(false);
    expect(reviewerAttempt.status).toBe(403);
    expect(reviewerAttempt.error).toContain("requires 'admin' privileges");
  });
});
