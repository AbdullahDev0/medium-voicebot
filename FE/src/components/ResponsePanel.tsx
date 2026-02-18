/**
 * @file ResponsePanel.tsx
 * @description Latest assistant response display.
 * @module components/ResponsePanel
 *

 */

import { UI } from '../constants';

type ResponsePanelProps = {
  text: string;
};

export const ResponsePanel = ({ text }: ResponsePanelProps) => (
  <section className="rounded-3xl border border-[var(--stroke)] bg-[var(--panel)] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.15)] sm:p-6">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        {UI.RESPONSE_TITLE}
      </h2>
    </div>
    <p className="mt-4 text-sm leading-relaxed text-[var(--ink)]">
      {text || UI.EMPTY_RESPONSE}
    </p>
  </section>
);
