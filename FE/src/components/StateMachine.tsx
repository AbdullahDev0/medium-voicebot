/**
 * @file StateMachine.tsx
 * @description State machine display.
 * @module components/StateMachine
 *

 */

import { STATE_DESCRIPTIONS, STATE_LABELS, STATE_ORDER, UI } from '../constants';
import type { VoiceState } from '../types';

type StateMachineProps = {
  currentState: VoiceState;
};

export const StateMachine = ({ currentState }: StateMachineProps) => (
  <section className="rounded-3xl border border-[var(--stroke)] bg-[var(--panel)] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.15)] sm:p-6">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        {UI.STATE_MACHINE_TITLE}
      </h2>
      <span className="text-xs text-[var(--muted)]">{STATE_LABELS[currentState]}</span>
    </div>
    <div className="mt-4 flex flex-col gap-3">
      {STATE_ORDER.map((state) => {
        const isActive = state === currentState;
        return (
          <div
            key={state}
            className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
              isActive
                ? 'border-[var(--ink)] bg-[var(--panel-2)] text-[var(--ink)]'
                : 'border-[var(--stroke)] bg-transparent text-[var(--muted)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`h-2 w-2 rounded-full ${isActive ? 'bg-[var(--ink)]' : 'bg-[var(--stroke)]'}`}
              />
              <span className="text-sm font-semibold uppercase tracking-[0.14em]">
                {STATE_LABELS[state]}
              </span>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] sm:text-right">
              {STATE_DESCRIPTIONS[state]}
            </span>
          </div>
        );
      })}
    </div>
  </section>
);
