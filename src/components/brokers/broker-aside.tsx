// Fixed right rail for the broker section — mirrors the dashboard's
// MarketChannel variant="aside" shell (hidden lg:flex, fixed top-0 right-0
// w-80). Pair with <DefaultLayout drawerRight> so the page reserves lg:mr-80.
// Holds the persistent top picks (always-in-view CTAs) + the affiliate
// disclosure. Hidden on mobile, where the in-column blocks carry the same
// content.
import { useEffect, useState } from "react";

import {
  BadgeChip,
  BrokerBuyBox,
  BrokerDisclosure,
  BrokerLogo,
  BrokerVisitLink,
  OfferBadge,
} from "./broker-ui";

import { api, type BrokerOffer } from "@/lib/api";
import { platformFeeSummary } from "@/lib/brokers";

/** Detail-page ordering for the rail nav — mirrors the compare page's
 *  "recommended" sort: top picks first, then editorial rank, then name. */
function recommendedOrder(brokers: BrokerOffer[]): BrokerOffer[] {
  return [...brokers].sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    const ra = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rb = b.rank ?? Number.MAX_SAFE_INTEGER;

    return ra - rb || a.name.localeCompare(b.name);
  });
}

/** Detail-page rail: a conversion buy-box for the broker being viewed, plus a
 *  side-nav of every review so readers can flick between platforms without
 *  going back to the grid. Same fixed shell as BrokerAside. */
export function BrokerNavAside({
  brokers,
  current,
}: {
  brokers: BrokerOffer[];
  current: BrokerOffer;
}) {
  const ordered = recommendedOrder(brokers);

  return (
    <aside className="hidden lg:flex fixed top-0 right-0 bottom-0 w-80 flex-col border-l border-[#e8e0d5] dark:border-separator bg-[#faf7f2] dark:bg-surface z-20">
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#e8e0d5] dark:border-separator shrink-0">
        <h2 className="text-sm font-semibold text-foreground/80">
          Broker reviews
        </h2>
        <a
          className="text-xs font-medium text-foreground/50 transition-colors hover:text-foreground"
          href="/brokers"
        >
          Compare all
        </a>
      </div>
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-x-0 top-0 h-4 pointer-events-none z-[1] bg-gradient-to-b from-[#faf7f2] dark:from-surface to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-4 pointer-events-none z-[1] bg-gradient-to-t from-[#faf7f2] dark:from-surface to-transparent" />
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="space-y-4 px-4 py-4">
            <BrokerBuyBox broker={current} />

            <nav aria-label="All broker reviews">
              <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/45">
                All platforms
              </p>
              <ul className="space-y-0.5">
                {ordered.map((b) => {
                  const active = b.slug === current.slug;

                  return (
                    <li key={b.slug}>
                      <a
                        aria-current={active ? "page" : undefined}
                        className={
                          active
                            ? "flex items-center gap-2.5 rounded-lg bg-background px-2 py-2 ring-1 ring-[#e8e0d5] dark:bg-white/[0.07] dark:ring-white/[0.08]"
                            : "flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                        }
                        href={`/brokers/${b.slug}`}
                      >
                        <BrokerLogo broker={b} size={28} />
                        <span
                          className={
                            active
                              ? "min-w-0 flex-1 truncate text-[13px] font-bold text-foreground"
                              : "min-w-0 flex-1 truncate text-[13px] font-medium text-foreground/75"
                          }
                        >
                          {b.name}
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums text-foreground/45">
                          {platformFeeSummary(b.fees)}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <BrokerDisclosure />
          </div>
        </div>
      </div>
    </aside>
  );
}

export function BrokerAside({
  brokers: provided,
  heading = "Top picks",
}: {
  /** Pass the already-loaded list to avoid a second fetch; omit to self-load. */
  brokers?: BrokerOffer[] | null;
  heading?: string;
}) {
  const [fetched, setFetched] = useState<BrokerOffer[] | null>(null);

  useEffect(() => {
    if (provided) return;
    api
      .brokers("UK")
      .then(setFetched)
      .catch(() => setFetched([]));
  }, [provided]);

  const brokers = provided ?? fetched;
  const picks = (brokers ?? []).filter((b) => b.recommended);

  return (
    <aside className="hidden lg:flex fixed top-0 right-0 bottom-0 w-80 flex-col border-l border-[#e8e0d5] dark:border-separator bg-[#faf7f2] dark:bg-surface z-20">
      <div className="h-16 px-4 flex items-center border-b border-[#e8e0d5] dark:border-separator shrink-0">
        <h2 className="text-sm font-semibold text-foreground/80">{heading}</h2>
      </div>
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-x-0 top-0 h-4 pointer-events-none z-[1] bg-gradient-to-b from-[#faf7f2] dark:from-surface to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-4 pointer-events-none z-[1] bg-gradient-to-t from-[#faf7f2] dark:from-surface to-transparent" />
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="px-4 py-4 space-y-4">
            {picks.map((b) => (
              <div
                key={b.slug}
                className="rounded-xl border border-[#e8e0d5] dark:border-separator bg-background/40 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <BrokerLogo broker={b} size={42} />
                    <a
                      className="truncate font-semibold text-foreground hover:underline"
                      href={`/brokers/${b.slug}`}
                    >
                      {b.name}
                    </a>
                  </span>
                  {b.badges.includes("top_pick") && (
                    <BadgeChip badge="top_pick" />
                  )}
                </div>
                <p className="mt-2 text-xs text-foreground/55">{b.tagline}</p>
                {b.offer_headline && (
                  <OfferBadge className="mt-2.5" text={b.offer_headline} />
                )}
                <p className="mt-2.5 text-[11px] text-foreground/50">
                  Platform fee: {platformFeeSummary(b.fees)}
                </p>
                <div className="mt-3">
                  <BrokerVisitLink
                    broker={b}
                    className="w-full"
                    placement="rail"
                    size="lg"
                  />
                </div>
              </div>
            ))}

            <BrokerDisclosure />
            <p className="text-[11px] leading-4 text-foreground/45">
              Ranked editorially on fees, features and FSCS protection — not
              commission. Capital at risk; always confirm current terms on the
              provider’s site.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
