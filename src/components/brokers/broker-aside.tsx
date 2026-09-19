// Fixed right rail for the broker section — mirrors the dashboard's
// MarketChannel variant="aside" shell (hidden lg:flex, fixed top-0 right-0
// w-80). Pair with <DefaultLayout drawerRight> so the page reserves lg:mr-80.
// Holds the persistent top picks (always-in-view CTAs) + the affiliate
// disclosure. Hidden on mobile, where the in-column blocks carry the same
// content.
import { GiftIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

import {
  BadgeChip,
  BrokerDisclosure,
  BrokerLogo,
  BrokerVisitLink,
  OfferBadge,
} from "./broker-ui";

import { Skeleton } from "@/components/skeleton";
import { api, type BrokerOffer } from "@/lib/api";
import { isOfferLive, platformFeeSummary } from "@/lib/brokers";

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

/** Detail-page rail: a pure selector — a side-nav of every review so readers
 *  can flick between platforms without going back to the grid. The current
 *  broker's conversion panel lives beside the article (sticky), not here.
 *  Same fixed shell as BrokerAside. */
export function BrokerNavAside({
  brokers,
  current,
}: {
  brokers: BrokerOffer[];
  current: BrokerOffer;
}) {
  const ordered = recommendedOrder(brokers);

  return (
    <aside className="page-rail hidden lg:flex fixed top-0 right-0 bottom-0 w-80 flex-col border-l border-rule bg-sheet dark:bg-surface z-20">
      <div className="h-16 px-4 flex items-center justify-between border-b border-rule shrink-0">
        <h2 className="text-body font-semibold text-foreground/80">
          Broker reviews
        </h2>
        <a
          className="text-caption font-medium text-foreground/50 transition-colors hover:text-foreground"
          href="/brokers"
        >
          Compare all
        </a>
      </div>

      {/* The platform nav scrolls — under the header and disclosure rules,
          with no edge fades (design language: contained, not blended). */}
      <div className="relative flex-1 min-h-0">
        <nav
          aria-label="All broker reviews"
          className="h-full overflow-y-auto overscroll-contain px-4 py-3"
        >
          <p className="px-1 pb-1.5 micro text-foreground/45">All platforms</p>
          <ul className="space-y-0.5">
            {ordered.map((b) => {
              const active = b.slug === current.slug;

              return (
                <li key={b.slug}>
                  <a
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "flex items-center gap-2.5 rounded-control bg-background px-2 py-2 ring-1 ring-hairline dark:bg-white/[0.07] dark:ring-white/[0.08]"
                        : "flex items-center gap-2.5 rounded-control px-2 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                    }
                    href={`/brokers/${b.slug}`}
                  >
                    <BrokerLogo broker={b} size={28} />
                    <span className="min-w-0 flex-1">
                      <span
                        className={
                          active
                            ? "block truncate text-small font-bold text-foreground"
                            : "block truncate text-small font-medium text-foreground/75"
                        }
                      >
                        {b.name}
                      </span>
                      {/* The live sign-up offer is the click-worthy hook here —
                          fees live on the detail page. Rows without an offer
                          stay single-line so the promos stand out. */}
                      {isOfferLive(b) && (
                        <span className="mt-0.5 flex items-center gap-1 text-caption font-semibold text-brand-brown dark:text-[#e7d4bf]">
                          <GiftIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{b.offer_headline}</span>
                        </span>
                      )}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Pinned disclosure — stays visible at the point of engagement. */}
      <div className="shrink-0 border-t border-rule px-4 py-3">
        <BrokerDisclosure className="!border-0 !bg-transparent !p-0 !text-caption" />
      </div>
    </aside>
  );
}

export function BrokerAside({
  brokers: provided,
  picks: providedPicks,
  heading = "Top picks",
  placement = "rail",
  ctaVariant = "primary",
  showAll = false,
}: {
  /** Pass the already-loaded list to avoid a second fetch; omit to self-load. */
  brokers?: BrokerOffer[] | null;
  /** Which platforms get a pick card. Defaults to the site-wide recommended
   *  set, which is right on a page that hasn't made its own argument. The
   *  broker guides pass their own: a category page rail showing two platforms
   *  the ranking beside it didn't choose is the page contradicting itself, and
   *  on a head-to-head the only two platforms in question are the pair. Empty
   *  or omitted falls back to the default, so the loading window doesn't
   *  briefly show a rail with no picks in it. */
  picks?: BrokerOffer[];
  heading?: string;
  /** GA label for every CTA in the rail. Defaults to the broker section's
   *  "rail"; the company pages pass "company_rail" so the two surfaces can be
   *  compared rather than pooled. */
  placement?: string;
  /** Fill for the rail's visit buttons. The company pages pass "grey": that
   *  page already spends its one filled button on the sticky "Buy <TICKER>
   *  with <broker>" panel, and three near-black buttons competing in the same
   *  viewport means the page has no primary action at all. */
  ctaVariant?: "primary" | "secondary" | "grey";
  /** Append the full platform list under the picks — every broker with its
   *  live sign-up offer, linking to its review. On a company page the rail is
   *  the only broker surface the visitor gets, so stopping at two picks hides
   *  the directory; on /compare the grid below already is the directory. */
  showAll?: boolean;
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
  // `null` is "still loading", `[]` is "loaded and empty" — only the first gets
  // a skeleton. Without one the rail is a blank 320px column on first paint
  // while the page beside it is already drawn, which reads as a broken layout
  // rather than a loading one.
  const loading = brokers === null;
  const picks = providedPicks?.length
    ? providedPicks
    : (brokers ?? []).filter((b) => b.recommended);
  // Everything the picks don't already cover — "all OTHER brokers", so the
  // same two platforms don't appear twice in one rail. Keyed off the picks
  // actually rendered rather than off `recommended`, or a page-supplied pick
  // would show up in both halves.
  const pickSlugs = new Set(picks.map((b) => b.slug));
  const rest = recommendedOrder(brokers ?? []).filter(
    (b) => !pickSlugs.has(b.slug),
  );

  return (
    <aside className="page-rail hidden lg:flex fixed top-0 right-0 bottom-0 w-80 flex-col border-l border-rule bg-sheet dark:bg-surface z-20">
      <div className="h-16 px-4 flex items-center border-b border-rule shrink-0">
        <h2 className="text-body font-semibold text-foreground/80">
          {heading}
        </h2>
      </div>
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto overscroll-contain">
          {loading ? (
            <RailSkeleton showAll={showAll} />
          ) : (
            <div className="px-4 py-4 space-y-4">
              {picks.map((b) => (
                <div
                  key={b.slug}
                  className="rounded-card border border-rule bg-background/40 p-3"
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
                  <p className="mt-2 text-caption text-foreground/55">
                    {b.tagline}
                  </p>
                  {isOfferLive(b) && (
                    <OfferBadge className="mt-2.5" text={b.offer_headline!} />
                  )}
                  <p className="mt-2.5 text-caption text-foreground/50">
                    Platform fee: {platformFeeSummary(b.fees)}
                  </p>
                  <div className="mt-3">
                    <BrokerVisitLink
                      broker={b}
                      className="w-full"
                      placement={placement}
                      size="lg"
                      variant={ctaVariant}
                    />
                  </div>
                </div>
              ))}

              {showAll && rest.length > 0 && (
                <nav aria-label="All trading platforms">
                  <p className="px-1 pb-1.5 pt-1 micro text-foreground/45">
                    All platforms
                  </p>
                  <ul className="space-y-0.5">
                    {rest.map((b) => (
                      <li key={b.slug}>
                        <a
                          className="flex items-center gap-2.5 rounded-control px-2 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                          href={`/brokers/${b.slug}`}
                        >
                          <BrokerLogo broker={b} size={28} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-small font-medium text-foreground/75">
                              {b.name}
                            </span>
                            {/* The live sign-up offer is the click-worthy hook —
                              fees live on the review. Rows without one stay
                              single-line so the promos stand out. */}
                            {isOfferLive(b) && b.offer_headline ? (
                              <span className="mt-0.5 flex items-center gap-1 text-caption font-semibold text-brand-brown dark:text-[#e7d4bf]">
                                <GiftIcon className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {b.offer_headline}
                                </span>
                              </span>
                            ) : null}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              <BrokerDisclosure />
              <p className="text-caption text-foreground/45">
                Ranked editorially on fees, features and FSCS protection, not
                commission. Capital at risk; always confirm current terms on the
                provider’s site.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/** The rail's loading state, at the real geometry: two pick cards and — when
 *  the rail is showing the full directory — a run of platform rows. Built on
 *  the house `Skeleton`, so its fill and tempo match every other loading
 *  surface on the site (seo/skeletons.tsx). */
function RailSkeleton({ showAll }: { showAll: boolean }) {
  return (
    <div aria-busy="true" className="px-4 py-4 space-y-4">
      <span className="sr-only">Loading trading platforms</span>
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          className="rounded-card border border-rule bg-background/40 p-3"
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="shrink-0" h={42} w={42} />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <Skeleton className="mt-3 h-2.5 w-4/5" />
          <Skeleton circle className="mt-3 h-6 w-3/5" />
          <Skeleton className="mt-3 h-2.5 w-2/3" />
          <Skeleton className="mt-3 h-10 w-full" />
        </div>
      ))}

      {showAll && (
        <div>
          <Skeleton className="mx-1 mb-2 mt-1 h-2 w-24" />
          <div className="space-y-0.5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2 py-2">
                <Skeleton className="shrink-0" h={28} w={28} />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
