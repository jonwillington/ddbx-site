import type { MarketFaqItem } from "@/lib/markets/types";

import { PlusIcon } from "@heroicons/react/20/solid";

/** Foot-of-page FAQ for a market. Minimal two-column layout: the section
 *  title sits on the left (sticky on desktop), the question/answer pairs run
 *  down the right as plain native <details> rows separated by hairline rules,
 *  with no surrounding card so the whole thing reads against the page
 *  background. Same accessible idiom as DisclosureSection (keyboard /
 *  screen-reader friendly, no third-party disclosure primitive). Renders
 *  nothing when the market supplies no FAQ. */
export function MarketFaq({ items }: { items?: MarketFaqItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <section
      aria-label="Frequently asked questions"
      className="w-full pt-14 md:pt-20"
    >
      <div className="grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] md:gap-16">
        <div className="md:sticky md:top-24 md:self-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Common questions
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-[2rem]">
            Everything investors ask first
          </h2>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Still unsure? The app gives the full analysis stream.
          </p>
        </div>

        <div className="border-t border-black/[0.08] dark:border-white/[0.1]">
          {items.map((item, i) => (
            <details
              key={i}
              className="group border-b border-black/[0.08] dark:border-white/[0.1]"
            >
              <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-4 py-5 text-left">
                <span className="text-lg font-medium leading-snug tracking-tight text-foreground/90 transition-colors duration-200 group-hover:text-foreground md:text-xl">
                  {item.question}
                </span>
                <PlusIcon className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 ease-out group-open:rotate-45" />
              </summary>
              <div className="max-w-prose pb-6 pr-8 text-[15px] leading-relaxed text-muted">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
