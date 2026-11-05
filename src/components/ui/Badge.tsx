import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'subtle' | 'accent' | 'positive' | 'warning' | 'neutral';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export function Badge({
  variant = 'subtle',
  size = 'md',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    subtle: 'bg-paper-warm text-ink-muted border-paper-line',
    neutral: 'bg-ink/5 text-ink border-ink/10',
    accent: 'bg-accent/10 text-accent border-accent/20',
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
  }[variant];

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-medium rounded-full border ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

