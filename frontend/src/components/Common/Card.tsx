import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'glass-strong' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      hover = false,
      interactive = false,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      rounded-card transition-all duration-normal
      focus-visible:outline-none focus-visible:ring-4
    `;

    const variantStyles = {
      default: `
        bg-bg-secondary border border-border-primary
        shadow-card
      `,
      glass: `
        glass
        shadow-card
      `,
      'glass-strong': `
        glass-strong
        shadow-card
      `,
      elevated: `
        bg-bg-elevated border border-border-primary
        shadow-elevated
      `,
      bordered: `
        bg-bg-secondary border-2 border-border-secondary
        shadow-none
      `,
    };

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hoverStyles = hover
      ? `
        hover:shadow-card-hover
        hover:border-border-hover
        hover:-translate-y-0.5
      `
      : '';

    const interactiveStyles = interactive
      ? `
        cursor-pointer
        active:scale-[0.99] active:shadow-card-pressed
        select-none
      `
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          paddingStyles[padding],
          hoverStyles,
          interactiveStyles,
          className
        )}
        onClick={onClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive && onClick
            ? (e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick(e as any);
                }
              }
            : undefined
        }
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
