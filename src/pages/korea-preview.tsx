// /kr and /kr-preview render the shared MarketPage shell driven by the
// KoreaMarket config. Anything Korea-specific (advance declarations, KRW
// rendering, DART reason codes, Hangul→English issuer names) lives in
// src/lib/markets/korea.tsx.
//
// Korea is the first market whose headline object is a DECLARATION rather
// than a completed trade, which is why MarketPage grew a plans surface — see
// MarketPlan in src/lib/markets/types.ts for why those are not MarketDealings.
import { MarketPage } from "@/components/market/market-page";
import { KoreaMarket } from "@/lib/markets/korea";

export default function KoreaPreviewPage() {
  return <MarketPage config={KoreaMarket} />;
}
