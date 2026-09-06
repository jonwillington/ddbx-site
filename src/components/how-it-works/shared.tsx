/** The tokens and small parts every section of /how-it-works shares.
 *
 *  Seven sections were built in parallel against one brief, and each one
 *  arrived with its own copy of the same six things: the hairline rule, the
 *  light panel, the mono eyebrow, a folded <details>, a "15 Jul 2026" date
 *  formatter and the numbered StepNode. Six copies of a token is how a page
 *  starts reading as generated — one gets tuned and the reader sees two
 *  slightly different objects doing the same job. So they live here, once.
 *
 *  Type species on this page, decided once (the page's own grammar 9):
 *
 *    EYEBROW   mono 11px, 0.16em, semibold — names a section, a panel, a
 *              stage. Brand-coloured by default; `EYEBROW_QUIET` for a rail
 *              label or a column heading that must not shout.
 *    KICKER    mono 10.5px, 0.14em — the tag under a row title (RowList's
 *              own kicker spec) and the small "Cleared / Not cleared" labels.
 *    CAPTION   12.5px at 50% — the "how to read this" line under a drawn
 *              object, and the provenance line. One species, so the five
 *              captions on the page read as one voice.
 *
 *  Row titles: the tenet-3 selling row (RowList/Row, 21/24px) for the checks
 *  and the limits; the ledger row (18/19.5px) for the pipeline; data rows
 *  (16px, the BoardRow scale) for feeds and tracked filings.
 */
import type { ReactNode } from "react";

import { ChevronDownIcon } from "@heroicons/react/20/solid";

export const RULE = "border-hairline dark:border-separator";
export const DIVIDE = "divide-black/[0.06] dark:divide-white/[0.08]";
export const PANEL =
  "rounded-2xl border border-hairline bg-sheet dark:border-white/[0.07] dark:bg-surface";

export const EYEBROW =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan";
export const EYEBROW_QUIET =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45";
export const KICKER =
  "font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]";
export const CAPTION = "text-[12.5px] leading-[1.6] text-foreground/50";

/** "15 Jul 2026" — the filing pages' short date. Parsed as UTC on purpose: a
 *  bare `new Date("2026-07-15")` renders as the 14th for every reader west of
 *  the meridian. */
export function shortDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** A folded paragraph: native <details>, so it costs no state, prints open
 *  where user agents choose to, and keeps its content in the DOM for the
 *  crawler pre-render. The fold is the point, not the content's demotion. */
export function Fold({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details className={`group ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-foreground/55 transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 -rotate-90 transition-transform group-open:rotate-0"
        />
        {label}
      </summary>
      <div className="mt-2.5">{children}</div>
    </details>
  );
}

/** A numbered stop: a stage in the pipeline or a check in the sequence, and
 *  page-wide it means nothing else. Mono figures so six of them read as a
 *  sequence rather than as six unrelated badges. */
export function StepNode({ index }: { index: number }) {
  return (
    <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-brown/25 bg-sheet font-mono text-[10.5px] font-semibold text-brand-brown dark:border-brand-tan/30 dark:bg-surface dark:text-brand-tan">
      {index + 1}
    </span>
  );
}
