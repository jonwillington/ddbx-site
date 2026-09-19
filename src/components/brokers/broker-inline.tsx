import type { BrokerOffer } from "@/lib/api";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

/** Top pick first, then editorial rank — the ordering the compare grid and the
 *  review rail use, so the company pages promote the same platform the rest of
 *  the site does rather than picking a favourite of their own. */
export function pickPromoted(brokers: BrokerOffer[]): BrokerOffer | null {
  const ordered = [...brokers].sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    const ra = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rb = b.rank ?? Number.MAX_SAFE_INTEGER;

    return ra - rb || a.name.localeCompare(b.name);
  });

  return ordered[0] ?? null;
}

/** Loads the promoted broker for a market. Null while loading and on failure —
 *  a broken promo should simply not appear. Brokers are a UK-only directory
 *  today, so other markets get nothing. */
export function usePromotedBroker(market: string): BrokerOffer | null {
  const [broker, setBroker] = useState<BrokerOffer | null>(null);

  useEffect(() => {
    if (market !== "UK") return;
    let live = true;

    api
      .brokers("UK")
      .then((all) => live && setBroker(pickPromoted(all)))
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, [market]);

  return broker;
}
