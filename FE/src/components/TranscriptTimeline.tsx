/**
 * @file TranscriptTimeline.tsx
 * @description Transcript timeline list.
 * @module components/TranscriptTimeline
 *

 */

import { ROLE_LABELS, UI } from '../constants';
import type { TranscriptItem } from '../types';

type TranscriptTimelineProps = {
  items: TranscriptItem[];
};

export const TranscriptTimeline = ({ items }: TranscriptTimelineProps) => (
  <section className="flex h-full flex-col gap-4 rounded-3xl border border-[var(--stroke)] bg-[var(--panel)] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.15)] sm:p-6">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        {UI.TRANSCRIPT_TITLE}
      </h2>
      <span className="text-xs text-[var(--muted)]">{items.length}</span>
    </div>
    <div className="flex-1 overflow-auto pr-2">
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{UI.EMPTY_TRANSCRIPT}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-[var(--stroke)] bg-[var(--panel-2)] p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                <span>{ROLE_LABELS[item.role]}</span>
                <span>{item.time}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{item.text}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  </section>
);
