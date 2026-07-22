import { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

export interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const THEME_KEY = 'terranode-theme';

export const ThemeToggle = ({ size = 'md', showLabel = true, className }: ThemeToggleProps) => {
  const [theme, setLocalTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved as 'light' | 'dark' | 'system';
    }
    return 'system';
  });

  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [theme, effectiveTheme]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTheme(e.target.value as 'light' | 'dark' | 'system');
  };

  const sizeConfig: Record<string, { width: number; height: number }> = {
    sm: { width: 24, height: 14 },
    md: { width: 28, height: 16 },
    lg: { width: 32, height: 18 },
  };

  const { width, height } = sizeConfig[size] || sizeConfig.md;
  const thumbOffset = effectiveTheme === 'dark'
    ? width - height
    : effectiveTheme === 'light'
    ? 2
    : (width - height) / 2;

  return (
    <div
      className={cn('theme-toggle', `theme-toggle--${size}`, className)}
      role="switch"
      aria-checked={effectiveTheme === 'dark'}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
          setLocalTheme(next);
        }
      }}
    >
      <input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={handleChange} className="sr-only" />
      <input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={handleChange} className="sr-only" />
      <input type="radio" name="theme" value="system" checked={theme === 'system'} onChange={handleChange} className="sr-only" />
      <div className="relative inline-block">
        <div className={`w-${width} h-${height} bg-bg-tertiary/50 rounded-full transition-all duration-normal relative`}>
          <div
            className="absolute top-0.5 left-0.5 bg-white/20 rounded-full transition-transform duration-normal"
            style={{
              width: height - 1,
              height: height - 1,
              transform: `translateX(${thumbOffset}px)`,
            }}
          />
        </div>
      </div>
      {showLabel && (
        <span className="ml-2 text-body-xs text-fg-secondary">
          {effectiveTheme === 'dark' ? 'Dark' : effectiveTheme === 'light' ? 'Light' : 'System'}
        </span>
      )}
    </div>
  );
};

ThemeToggle.displayName = 'ThemeToggle';
