'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RoleSwitcher } from './RoleSwitcher';
import { ResetDemoButton } from './ResetDemoButton';

export function TopBar() {
  const pathname = usePathname();
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [revalCount, setRevalCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function loadBadges() {
      try {
        const [reviewRes, revalRes] = await Promise.all([
          fetch('/api/review/queue').catch(() => null),
          fetch('/api/revalidation').catch(() => null),
        ]);

        if (reviewRes && reviewRes.ok && isMounted) {
          const q = await reviewRes.json();
          if (Array.isArray(q)) setReviewCount(q.length);
        }

        if (revalRes && revalRes.ok && isMounted) {
          const r = await revalRes.json();
          if (r && Array.isArray(r.items)) setRevalCount(r.items.length);
        }
      } catch {
        // Silently ignore background polling errors
      }
    }

    loadBadges();
    const interval = setInterval(loadBadges, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/library', label: 'Library' },
    { href: '/content', label: 'Content' },
    { href: '/review', label: 'Review', count: reviewCount },
    { href: '/revalidation', label: 'Revalidation', count: revalCount },
    { href: '/evaluation', label: 'Evaluation' },
    { href: '/audit', label: 'Audit' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-paper-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="font-serif text-xl font-bold tracking-tight text-ink flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block"></span>
          ProofGate
        </Link>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, count }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'relative rounded-md px-3 py-1.5 text-sm transition-colors duration-150 flex items-center gap-1.5',
                  active
                    ? 'bg-ink/10 font-semibold text-ink'
                    : 'text-ink-muted hover:bg-ink/5 hover:text-ink',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <span>{label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={[
                      'px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full',
                      href === '/revalidation'
                        ? 'bg-accent text-white'
                        : 'bg-emerald-600 text-white',
                    ].join(' ')}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-ink-muted lg:inline">
            Demo mode · no sign-in
          </span>
          <RoleSwitcher />
          <ResetDemoButton />
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="flex md:hidden overflow-x-auto border-t border-paper-line px-4 py-2 gap-1 bg-paper-warm/50 text-xs">
        {navLinks.map(({ href, label, count }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                'whitespace-nowrap px-2.5 py-1 rounded flex items-center gap-1 font-medium',
                active ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              <span>{label}</span>
              {count !== undefined && count > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block"></span>
              )}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
