/** Objection handling, placed next to the CTA rather than in the footer.
 *
 *  Built on native <details>/<summary>: keyboard and screen-reader behaviour
 *  come for free, it works with JS off, and the open/close state survives a
 *  find-in-page. The only JS-ish part is the chevron, which is a CSS rotation
 *  off `details[open]`.
 *
 *  Keep this list SHORT. It exists to remove the four reasons someone doesn't
 *  tap install — not to be a knowledge base. The full per-market FAQ lives on
 *  the market pages (`src/lib/markets/faq.tsx`).
 */
import type { ReactNode } from "react";

import { Reveal } from "./reveal";

export interface FaqItem {
  q: string;
  a: ReactNode;
}

export function DownloadFaq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mx-auto max-w-2xl">
      <style>{`
        .dl-faq > summary { list-style: none; }
        .dl-faq > summary::-webkit-details-marker { display: none; }
        .dl-faq .dl-faq-chev { transition: transform 220ms ease; }
        .dl-faq[open] .dl-faq-chev { transform: rotate(180deg); }
        @media (prefers-reduced-motion: reduce) {
          .dl-faq .dl-faq-chev { transition: none; }
        }
      `}</style>

      {items.map((item, i) => (
        <Reveal key={item.q} delay={i * 60}>
          <details className="dl-faq group border-b border-hairline dark:border-border/50">
            <summary className="flex cursor-pointer items-center gap-4 py-5 text-left text-base font-medium transition-colors hover:text-foreground/70">
              <span className="flex-1">{item.q}</span>
              <svg
                aria-hidden="true"
                className="dl-faq-chev h-4 w-4 shrink-0 text-foreground/40"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 9l6 6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>
            <div className="pb-5 pr-8 text-sm leading-relaxed text-foreground/65">
              {item.a}
            </div>
          </details>
        </Reveal>
      ))}
    </div>
  );
}
