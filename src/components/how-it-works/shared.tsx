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
 *    eyebrow()  mono 11, 0.16em, semibold (`@/components/ui/eyebrow`) — names
 *               a section, a panel, a stage; `eyebrow("quiet")` for a rail
 *               label or a column heading that must not shout.
 *    micro      mono 10, 0.14em — the tag under a row title and the small
 *               "Cleared / Not cleared" labels.
 *    caption    `text-small text-foreground/50` — the "how to read this" line
 *               under a drawn object, and the provenance line.
 *
 *   *  selling row (RowList/Row, 24/26px) for the checks and the limits; the
 *  ledger row (22/24px) for the pipeline; data rows (17px names, 16px
 *  tabular figures) for feeds and tracked filings. Body prose is 16px/1.65.
 */
import type { ReactNode } from "react";

import { ChevronDownIcon } from "@heroicons/react/20/solid";

import { panel } from "@/components/ui/panel";

/** The light panel: the site's one `panel()` recipe (sheet, hairline,
 *  rounded-card). Padding stays at each call site. */
export const PANEL = panel();

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
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-small font-medium text-foreground/55 transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
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
    <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-brown/25 bg-sheet font-mono text-caption font-semibold text-brand-brown dark:border-brand-tan/30 dark:bg-surface dark:text-brand-tan">
      {index + 1}
    </span>
  );
}
