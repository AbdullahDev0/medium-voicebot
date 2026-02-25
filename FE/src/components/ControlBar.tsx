/**
 * @file ControlBar.tsx
 * @description Message input and controls.
 * @module components/ControlBar
 *

 */

import { ARIA, IDS, LIMITS, UI } from '../constants';

type ControlBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onToggleListening: () => void;
  onStop?: () => void;
  onClear: () => void;
  isListening: boolean;
  isBusy: boolean;
  inputDisabled?: boolean;
  sendDisabled?: boolean;
  stopDisabled?: boolean;
  showStop?: boolean;
  placeholder?: string;
};

type MicButtonProps = {
  onClick: () => void;
  isListening: boolean;
  disabled: boolean;
};

const MicButton = ({ onClick, isListening, disabled }: MicButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ARIA.TOGGLE_MIC}
    className={`flex h-12 w-12 items-center justify-center rounded-full border border-[var(--stroke)] bg-[var(--panel-2)] text-[var(--ink)] transition ${
      isListening ? 'shadow-[0_0_20px_rgba(0,0,0,0.35)]' : ''
    } ${disabled ? 'opacity-60' : 'hover:scale-[1.04]'}`}
  >
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
    </svg>
  </button>
);

export const ControlBar = ({
  value,
  onChange,
  onSend,
  onToggleListening,
  onStop,
  onClear,
  isListening,
  isBusy,
  inputDisabled = false,
  sendDisabled = false,
  stopDisabled = false,
  showStop = false,
  placeholder,
}: ControlBarProps) => (
  <form
    className="flex flex-col gap-3 rounded-3xl border border-[var(--stroke)] bg-[var(--panel)] px-4 py-3 shadow-[0_20px_40px_rgba(0,0,0,0.12)] sm:flex-row sm:items-center sm:rounded-full"
    onSubmit={(event) => {
      event.preventDefault();
      onSend();
    }}
  >
    <label className="sr-only" htmlFor={IDS.INPUT_MESSAGE}>
      {UI.INPUT_LABEL}
    </label>
    <input
      id={IDS.INPUT_MESSAGE}
      aria-label={ARIA.INPUT_MESSAGE}
      value={value}
      maxLength={LIMITS.MAX_INPUT_LENGTH}
      disabled={inputDisabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder ?? UI.INPUT_PLACEHOLDER}
      className="w-full min-w-0 flex-1 bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none"
    />
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
      {showStop ? (
        <button
          type="button"
          onClick={onStop}
          aria-label={ARIA.REALTIME_STOP}
          disabled={stopDisabled || isBusy}
          className={`rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
            stopDisabled || isBusy
              ? 'opacity-60'
              : 'hover:border-[var(--ink)] hover:text-[var(--ink)]'
          }`}
        >
          {UI.REALTIME_STOP_LABEL}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClear}
        aria-label={ARIA.CLEAR_TRANSCRIPT}
        className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] transition hover:text-[var(--ink)]"
      >
        {UI.CLEAR_LABEL}
      </button>
      <button
        type="submit"
        aria-label={ARIA.SEND_MESSAGE}
        disabled={isBusy || !value || sendDisabled}
        className={`rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
          isBusy || !value || sendDisabled
            ? 'opacity-60'
            : 'hover:border-[var(--ink)] hover:text-[var(--ink)]'
        }`}
      >
        {UI.SEND_LABEL}
      </button>
      <MicButton
        onClick={onToggleListening}
        isListening={isListening}
        disabled={isBusy}
      />
    </div>
  </form>
);
