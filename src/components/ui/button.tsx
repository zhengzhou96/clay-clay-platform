'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-clay-terracotta focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-clay-terracotta text-clay-white hover:bg-clay-rust active:scale-98 shadow-sm hover:shadow-md',
        secondary:
          'bg-clay-sand text-clay-ink hover:bg-clay-warm-gray active:scale-98 border border-clay-warm-gray',
        outline:
          'border-2 border-clay-ink text-clay-ink hover:bg-clay-ink hover:text-clay-white active:scale-98',
        ghost:
          'text-clay-ink hover:bg-clay-sand active:scale-98',
        link:
          'text-clay-terracotta underline-offset-4 hover:underline active:scale-98',
      },
      size: {
        default: 'h-11 px-6 py-3 text-base',
        sm: 'h-9 px-4 py-2 text-sm',
        lg: 'h-14 px-8 py-4 text-lg',
        xl: 'h-16 px-10 py-5 text-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
