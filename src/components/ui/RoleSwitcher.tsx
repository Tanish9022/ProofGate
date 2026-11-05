'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Role = 'admin' | 'creator' | 'reviewer';
export const ROLES: Role[] = ['creator', 'reviewer', 'admin'];
export const ROLE_LABELS: Record<Role, string> = {
  creator: 'Creator',
  reviewer: 'Reviewer',
  admin: 'Admin',
};

const RoleContext = createContext<{ role: Role; setRole: (r: Role) => void }>({
  role: 'creator',
  setRole: () => {},
});

export function useRole() {
  return useContext(RoleContext);
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('creator');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pg_role') as Role | null;
      if (stored && ROLES.includes(stored)) setRoleState(stored);
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pg_role' && e.newValue && ROLES.includes(e.newValue as Role)) {
        setRoleState(e.newValue as Role);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    try {
      localStorage.setItem('pg_role', r);
      window.dispatchEvent(new Event('role_changed'));
    } catch {}
  };

  useEffect(() => {
    const handleRoleChanged = () => {
      try {
        const stored = localStorage.getItem('pg_role') as Role | null;
        if (stored && ROLES.includes(stored)) setRoleState(stored);
      } catch {}
    };
    window.addEventListener('role_changed', handleRoleChanged);
    return () => window.removeEventListener('role_changed', handleRoleChanged);
  }, []);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div
      role="group"
      aria-label="Switch demo role"
      className="flex rounded border border-line-strong bg-paper text-xs"
    >
      {ROLES.map(r => (
        <button
          key={r}
          type="button"
          onClick={() => setRole(r)}
          className={[
            'px-2.5 py-1 transition-colors duration-120 first:rounded-l last:rounded-r font-medium',
            role === r
              ? 'bg-ink text-paper'
              : 'text-ink-muted hover:bg-ink/[.06] hover:text-ink',
          ].join(' ')}
          aria-pressed={role === r}
        >
          {ROLE_LABELS[r]}
        </button>
      ))}
    </div>
  );
}
