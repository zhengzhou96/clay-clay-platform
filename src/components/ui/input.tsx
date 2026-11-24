'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-sm border border-clay-ink/20 bg-clay-white px-4 py-3 text-base ring-offset-clay-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-clay-ink/50 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-clay-terracotta focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
