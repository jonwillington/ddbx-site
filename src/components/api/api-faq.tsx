import type { ReactNode } from "react";

import { PlusIcon } from "@heroicons/react/20/solid";

/** Two-column FAQ, dark variant.
 *
 *  Mirrors `components/market/market-faq.tsx` — sticky left title block, native
 *  <details> rows on hairline rules, PlusIcon rotating 45° on open — rather
 *  than `DownloadFaq`'s centred stack. The two-column form is the more
 *  editorial of the two and suits a reader who is evaluating rather than being
 *  converted. MarketFaq itself hardcodes its heading copy and takes
 *  `MarketFaqItem`, so this is the same idiom rather than a wrapper.
 *
 *  Colours are literal (no `dark:` variants): the route pins `.dark`, so a
 *  theme-aware token would be resolving against a class this page never
 *  un-sets. Literal values keep the intent readable.
 */

export interface ApiFaqItem {
  q: string;
  a: ReactNode;
}

export function ApiFaq({
  items,
  title,
  standfirst,
}: {
  items: ApiFaqItem[];
  title: string;
  standfirst?: string;
}) {
  return (
    <section aria-label="Frequently asked questions" className="w-full">
      <div className="grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] md:gap-16">
        <div className="md:sticky md:top-24 md:self-start">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#eec584]">
            Common questions
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-white md:text-[2rem]">
            {title}
          </h2>
          {standfirst ? (
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              {standfirst}
            </p>
          ) : null}
        </div>

        <div className="border-t border-white/[0.12]">
          {items.map((item) => (
            <details
              key={item.q}
              className="group border-b border-white/[0.12]"
            >
              <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-4 py-5 text-left">
                <span className="text-lg font-medium leading-snug tracking-tight text-white/90 transition-colors duration-200 group-hover:text-white md:text-xl">
                  {item.q}
                </span>
                <PlusIcon className="h-5 w-5 shrink-0 text-white/40 transition-transform duration-300 ease-out group-open:rotate-45" />
              </summary>
              <div className="max-w-prose pb-6 pr-8 text-[15px] leading-relaxed text-white/55">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
