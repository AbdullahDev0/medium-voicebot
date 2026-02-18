/**
 * @file VoiceOrb.tsx
 * @description Central voice orb control.
 * @module components/VoiceOrb
 *

 */

import { ARIA } from '../constants';

type VoiceOrbProps = {
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
};

type MicIconProps = {
  isActive: boolean;
};

const MicIcon = ({ isActive }: MicIconProps) => (
  <svg
    width="42"
    height="42"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`transition-transform duration-300 ${isActive ? 'scale-105' : 'scale-100'}`}
    aria-hidden="true"
  >
    <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
    <path d="M19 11a7 7 0 0 1-14 0" />
    <path d="M12 18v3" />
    <path d="M8 21h8" />
  </svg>
);

export const VoiceOrb = ({ isActive, onClick, disabled }: VoiceOrbProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ARIA.TOGGLE_MIC}
    className={`relative flex h-40 w-40 items-center justify-center rounded-full border border-[var(--stroke)] bg-[radial-gradient(circle_at_top,var(--orb-core),var(--orb-core-2))] text-[var(--ink)] shadow-[0_25px_60px_rgba(0,0,0,0.25)] transition-all duration-300 sm:h-48 sm:w-48 ${
      isActive ? 'scale-[1.02] shadow-[0_30px_70px_rgba(0,0,0,0.35)]' : 'scale-100'
    } ${disabled ? 'opacity-60' : 'hover:scale-[1.03]'}`}
  >
    <span
      className={`absolute inset-0 rounded-full border ${
        isActive ? 'border-[var(--glow-strong)] shadow-[0_0_40px_rgba(0,0,0,0.35)]' : 'border-[var(--glow)]'
      }`}
    />
    <span
      className={`absolute inset-4 rounded-full border ${
        isActive ? 'border-[var(--glow-strong)]' : 'border-[var(--glow)]'
      }`}
    />
    <MicIcon isActive={isActive} />
  </button>
);
