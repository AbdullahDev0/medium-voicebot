/**
 * @file ThemeToggle.tsx
 * @description Light/dark theme toggle control.
 * @module components/ThemeToggle
 *

 */

import { ARIA, THEME, UI } from '../constants';
import type { ThemeOption } from '../types';

type ThemeToggleProps = {
  theme: ThemeOption;
  onToggle: () => void;
};

const SunIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M4.93 4.93l1.41 1.41" />
    <path d="M17.66 17.66l1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M6.34 17.66l-1.41 1.41" />
    <path d="M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

export const ThemeToggle = ({ theme, onToggle }: ThemeToggleProps) => {
  const isDark = theme === THEME.DARK;
  const label = isDark ? UI.THEME_DARK : UI.THEME_LIGHT;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ARIA.THEME_TOGGLE}
      className="flex items-center gap-2 rounded-full border border-[var(--stroke)] bg-[var(--panel)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink)] transition hover:border-[var(--ink)]"
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
      <span>{UI.THEME_LABEL}</span>
      <span className="text-[var(--muted)]">{label}</span>
    </button>
  );
};
