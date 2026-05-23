import { useLocation } from "react-router-dom";

import { MarketPage } from "@/components/market/market-page";
import { marketForPath } from "@/lib/markets/registry";

/** Host-aware market landing page.
 *  - ddbx.uk  -> UK at "/"
 *  - ddbx.us  -> US at "/"
 *  - ddbx.eu  -> SE at "/" (NL keeps "/nl")
 */
export default function MarketHomePage() {
  const location = useLocation();
  const market = marketForPath(location.pathname);

  return <MarketPage config={market.config} />;
}
