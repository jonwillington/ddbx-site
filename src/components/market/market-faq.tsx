import type { MarketFaqItem } from "@/lib/markets/types";

import { ChevronRightIcon } from "@heroicons/react/20/solid";

/** Foot-of-page FAQ for a market. Plain native <details> rows in the same
 *  idiom as DisclosureSection (keyboard / screen-reader friendly, no
 *  third-party disclosure primitive), styled for readable question/answer
 *  pairs rather than the tiny uppercase drawer labels. Renders nothing when
 *  the market supplies no FAQ. */
export function MarketFaq({ items }: { items?: MarketFaqItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <section
      aria-label="Frequently asked questions"
      className="mx-auto w-full max-w-2xl pt-4"
    >
      <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">
        Common questions
      </h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <details
            key={i}
            className="group rounded-lg border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-surface"
          >
            <summary className="flex cursor-pointer list-none select-none items-center gap-2 px-4 py-3">
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90" />
              <span className="flex-1 text-sm font-medium text-foreground/90">
                {item.question}
              </span>
            </summary>
            <div className="border-t border-black/[0.04] px-4 pb-4 pt-3 text-sm leading-relaxed text-foreground/65 dark:border-white/[0.06]">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
