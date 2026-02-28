/**
 * @file PropertiesModeToggle.tsx
 * @description Listings mode toggle control for chat vs realtime.
 * @module components/PropertiesModeToggle
 *
 */

import { ARIA, PROPERTIES_MODE_LABELS, PROPERTIES_MODES, UI } from '../constants';
import type { PropertiesModeOption } from '../types';

type PropertiesModeToggleProps = {
  mode: PropertiesModeOption;
  onChange: (mode: PropertiesModeOption) => void;
  showRealtime?: boolean;
};

const buildModeOptions = (showRealtime: boolean) => {
  const options = [
    {
      value: PROPERTIES_MODES.CHAT,
      label: PROPERTIES_MODE_LABELS[PROPERTIES_MODES.CHAT],
      hint: UI.PROPERTIES_MODE_HINT_CHAT,
    },
  ];
  if (showRealtime) {
    options.push({
      value: PROPERTIES_MODES.REALTIME,
      label: PROPERTIES_MODE_LABELS[PROPERTIES_MODES.REALTIME],
      hint: UI.PROPERTIES_MODE_HINT_REALTIME,
    });
  }
  return options;
};

export const PropertiesModeToggle = ({
  mode,
  onChange,
  showRealtime = false,
}: PropertiesModeToggleProps) => (
  <div
    className="flex items-center gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] px-3 py-2"
    role="radiogroup"
    aria-label={ARIA.PROPERTIES_MODE_TOGGLE}
  >
    <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
      {UI.PROPERTIES_MODE_LABEL}
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
