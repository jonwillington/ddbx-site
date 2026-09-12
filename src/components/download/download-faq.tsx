/** Objection handling, placed next to the CTA rather than in the footer.
 *
 *  Compatibility shim; inline at the call site if trivial. The download pages
 *  had their own `<details>` styling — a fourth accordion species on a site
 *  that already had `MarketFaq` on the market and record pages and `Fold` on
 *  /how-it-works — so the questions render through `MarketFaq` now. Keeping
 *  the `DownloadFaq` name and the `{ q, a }` item shape means the page's call
 *  site and `copy.tsx`'s three dictionaries did not have to move in the same
 *  change; once this is the only thing left in the file, drop it and adapt the
 *  items where they are built.
 *
 *  `MarketFaq` also gives the section the rule and eyebrow it lacked: on the
 *  download page the questions hung unlabelled off the foot of the price
 *  section.
 *
 *  The heading block comes from the page's dictionary (`faqCopy`), so the
 *  Chinese edition does not inherit `MarketFaq`'s English default.
 *
 *  Keep this list SHORT. It exists to remove the four reasons someone doesn't
 *  tap install — not to be a knowledge base. The full per-market FAQ lives on
 *  the market pages (`src/lib/markets/faq.tsx`).
 */
import type { ReactNode } from "react";

import { MarketFaq, type MarketFaqCopy } from "@/components/market/market-faq";

export interface FaqItem {
  q: string;
  a: ReactNode;
}

export function DownloadFaq({
  items,
  copy,
}: {
  items: FaqItem[];
  copy: MarketFaqCopy;
}) {
  return (
    <MarketFaq
      copy={copy}
      items={items.map((item) => ({ question: item.q, answer: item.a }))}
    />
  );
}
