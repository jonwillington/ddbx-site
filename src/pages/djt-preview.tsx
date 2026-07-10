// /djt renders the shared MarketPage shell driven by the DjtMarket config
// (Trump Media insider Form 4 trades). Everything market-specific lives in
// src/lib/markets/djt.tsx.
import { MarketPage } from "@/components/market/market-page";
import { DjtMarket } from "@/lib/markets/djt";

export default function DjtPreviewPage() {
  return <MarketPage config={DjtMarket} />;
}
