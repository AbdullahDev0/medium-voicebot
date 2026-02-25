/**
 * @file ModeToggle.tsx
 * @description Mode toggle control for normal vs agent mode.
 * @module components/ModeToggle
 *
 */

import { ARIA, MODE_LABELS, MODES, UI } from '../constants';
import type { ModeOption } from '../types';

type ModeToggleProps = {
  mode: ModeOption;
  onChange: (mode: ModeOption) => void;
  showRealtime?: boolean;
};

const buildModeOptions = (showRealtime: boolean) => {
  const options = [
    {
      value: MODES.NORMAL,
      label: MODE_LABELS[MODES.NORMAL],
      hint: UI.MODE_HINT_NORMAL,
    },
    {
      value: MODES.AGENT,
      label: MODE_LABELS[MODES.AGENT],
      hint: UI.MODE_HINT_AGENT,
    },
  ];
  if (showRealtime) {
    options.push({
      value: MODES.REALTIME,
      label: MODE_LABELS[MODES.REALTIME],
      hint: UI.MODE_HINT_REALTIME,
    });
  }
  return options;
};

export const ModeToggle = ({ mode, onChange, showRealtime = false }: ModeToggleProps) => (
  <div
    className="flex items-center gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] px-3 py-2"
    role="radiogroup"
    aria-label={ARIA.MODE_TOGGLE}
  >
    <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
      {UI.MODE_LABEL}
    </span>
    <div className="flex items-center gap-2 rounded-2xl border border-[var(--stroke)] bg-[var(--panel-2)] p-1">
      {buildModeOptions(showRealtime).map((option) => {
        const isActive = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-2 rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              isActive
                ? 'bg-[var(--ink)] text-[var(--panel)] shadow-[0_0_20px_var(--glow-strong)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <span>{option.label}</span>
            <span
              className={`text-[10px] tracking-[0.18em] ${
                isActive ? 'text-[var(--panel)]' : 'text-[var(--muted)]'
              }`}
            >
              {option.hint}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);
