import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

/** One issuer's filings, as the company bundle serves them, shared by every
 *  panel on a filing page that reads them (the cluster drawing and the
 *  other-buys list). One request per issuer per session: the promise is
 *  cached, so two panels mounting together make one call, and stepping from a
 *  filing to its neighbour at the same company costs nothing. A failure is
 *  evicted so a later visit can retry. */
const cache = new Map<string, Promise<Array<Dealing | UsDealing>>>();

function load(market: string, ticker: string) {
  const key = `${market.toUpperCase()}|${ticker}`;
  let p = cache.get(key);

  if (!p) {
    p = api
      .companyPage(market, ticker)
      .then((r) => r.deals as Array<Dealing | UsDealing>);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }

  return p;
}

/** `null` while loading, `[]` on failure: every caller degrades to nothing. */
export function useIssuerDeals(
  market: string,
  ticker: string,
): Array<Dealing | UsDealing> | null {
  const [deals, setDeals] = useState<Array<Dealing | UsDealing> | null>(null);

  useEffect(() => {
    let live = true;

    setDeals(null);
    load(market, ticker)
      .then((d) => live && setDeals(d))
      .catch(() => live && setDeals([]));

    return () => {
      live = false;
    };
  }, [market, ticker]);

  return deals;
}
