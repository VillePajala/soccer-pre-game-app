'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-500/90 hover:to-violet-600/90 text-white focus:ring-indigo-500 shadow-lg shadow-indigo-900/20',
  secondary:
    'bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500 border border-slate-600',
  destructive:
    'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  ghost:
    'bg-transparent text-slate-200 hover:bg-white/5 focus:ring-slate-500 border border-slate-600/40',
};

export default function Button({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'px-3 sm:px-4 py-2.5 sm:py-3 rounded-md text-base sm:text-lg font-semibold transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <button className={`${base} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}


