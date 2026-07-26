import type { BrokerOffer } from "@/lib/api";

import { useEffect, useState } from "react";

import { BrokerLogo, BrokerVisitLink, OfferBadge } from "./broker-ui";

import { api } from "@/lib/api";
import { isAffiliateLink, isOfferLive } from "@/lib/brokers";

/** In-flow broker prompt for the company pages.
 *
 *  A company page is the highest-intent surface on the site: someone reading
 *  "four directors bought £7.5m of this" is one step from wanting to own it.
 *  On desktop that step is the fixed rail (BrokerAside); this is the mobile
 *  twin, rendered in the flow right after the buys table where the rail
 *  doesn't exist.
 *
 *  Tagging comes from BrokerVisitLink — per-broker GA4 event, placement label,
 *  affiliate rel and affiliate marker, same as every other broker CTA.
 */

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

export function BrokerInline({
  broker,
  company,
  className,
  placement = "company_inline",
}: {
  broker: BrokerOffer | null;
  company: string;
  className?: string;
  placement?: string;
}) {
  if (!broker) return null;

  return (
    <aside
      aria-label={`Invest with ${broker.name}`}
      className={`rounded-2xl border border-[#e3d9c9] bg-[#fffdf9] p-5 dark:border-white/10 dark:bg-surface ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrokerLogo broker={broker} size={34} />
          <div>
            <p className="text-[13px] font-semibold leading-snug text-foreground">
              Want to own {company}?
            </p>
            <p className="mt-1 text-[12.5px] leading-snug text-foreground/60">
              {broker.tagline}
            </p>
          </div>
        </div>
        <BrokerVisitLink broker={broker} placement={placement} size="lg">
          Start investing with {broker.name}
        </BrokerVisitLink>
      </div>
      {isOfferLive(broker) && (
        <OfferBadge className="mt-3" text={broker.offer_headline!} />
      )}
      {/* The disclosure sits at the point of engagement, not only the footer. */}
      <p className="mt-2.5 text-[10px] leading-snug text-foreground/45">
        <span className="font-semibold text-foreground/60">Ad</span> · Capital
        at risk.{isAffiliateLink(broker) ? " We may earn a commission." : ""}
      </p>
    </aside>
  );
}
