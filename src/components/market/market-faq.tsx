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
      className="mx-auto w-full max-w-3xl pt-6 md:pt-8"
    >
      <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white/90 shadow-[0_18px_50px_-28px_rgba(37,26,14,0.35)] backdrop-blur-sm dark:border-white/[0.12] dark:bg-surface/90">
        <div className="border-b border-black/[0.06] px-4 py-4 text-center dark:border-white/[0.08] md:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Common questions
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground/90">
            Everything investors ask first
          </h2>
        </div>

        <div className="p-2 md:p-3">
          {items.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-transparent bg-transparent transition-all duration-200 hover:border-black/[0.06] hover:bg-[#faf7f2] open:border-[#e6dccf] open:bg-[#faf7f2] open:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:hover:border-white/[0.1] dark:hover:bg-white/[0.03] dark:open:border-white/[0.12] dark:open:bg-white/[0.04]"
            >
              <summary className="flex cursor-pointer list-none select-none items-start gap-2.5 px-3 py-3.5 md:px-4">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#6f563d] transition-colors duration-200 group-open:border-[#b89e84] group-open:bg-[#f2e6d8] group-open:text-[#5a4128] dark:border-white/[0.16] dark:bg-white/[0.04] dark:text-[#c9b49f] dark:group-open:border-[#ad9479]/60 dark:group-open:bg-[#ad9479]/15 dark:group-open:text-[#d8c4af]">
                  <ChevronRightIcon className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-90" />
                </span>
                <span className="flex-1 text-sm font-medium leading-relaxed text-foreground/90">
                  {item.question}
                </span>
              </summary>
              <div className="mx-3 border-t border-black/[0.06] pb-4 pl-8 pr-2 pt-3 text-sm leading-relaxed text-foreground/70 dark:border-white/[0.08] md:mx-4">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-muted/70">
        Still unsure? The app gives the full analysis stream.
      </p>
    </section>
  );
}
