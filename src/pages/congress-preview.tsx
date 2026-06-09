// /directors (and /congress) render the shared MarketPage shell driven by the
// CongressMarket config (US House STOCK Act trades). Everything market-specific
// lives in src/lib/markets/congress.tsx.
import { MarketPage } from "@/components/market/market-page";
import { CongressMarket } from "@/lib/markets/congress";

export default function CongressPreviewPage() {
  return <MarketPage config={CongressMarket} />;
}
