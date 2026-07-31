/** "Best UK platforms for X" — /brokers/best-for/:category.
 *
 *  The editorial content (which brokers, in what order, the one-line pick for
 *  each, and the ranking rationale) lives in shared/broker-categories.js,
 *  because the crawler pre-render at functions/brokers/best-for/[category].js
 *  has to render the same words and can't import from src/.
 *
 *  What this page deliberately is NOT: a filtered list. Roughly half the UK
 *  brokers we hold carry `best_for_beginners`, so a badge filter alone
 *  produces most of the market in arbitrary order — a query result rather than
 *  a recommendation. The badge decides eligibility; the module's `order`
 *  decides the ranking; and each entry carries a sentence saying who it's for
 *  and how it differs from the one above. That sentence is the page.
 *
 *  Compliance posture matches the rest of /brokers: the affiliate disclosure
 *  sits above the fold rather than in the footer (in the shell's `notice` slot,
 *  which renders above the loading boundary — so it is on screen before any
 *  commercial link can be), outbound links carry rel="sponsored" via
 *  BrokerVisitLink, expired incentives are suppressed by isOfferLive(), the
 *  badge each row carries is shown on the row so a "best for X" claim is
 *  traceable, and the standard risk disclaimers plus the ranking methodology
 *  close the page below the app band.
 */
import type { BrokerBadge, BrokerOffer } from "@/lib/api";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  brokersForCategory,
  categoryBySlug,
  categoryPath,
  CATEGORIES,
  MIN_BROKERS,
  whyWeRank,
} from "../../shared/broker-categories.js";
import {
  COMPARISONS,
  comparisonPath,
} from "../../shared/broker-comparisons.js";

import {
  BadgeChip,
  BrokerComplianceNote,
  BrokerDisclosure,
  BrokerLogo,
  BrokerVisitLink,
  OfferBadge,
} from "@/components/brokers/broker-ui";
import {
  bestInColumn,
  ColHeader,
  COLUMN_HELP,
  ColumnValue,
  columnLabel,
  FeeTiles,
  LogoPair,
  PageSection,
  R,
  STICKY_COL,
  VerifiedNote,
} from "@/components/brokers/broker-page-ui";
import { BrokerAside } from "@/components/brokers/broker-aside";
import DefaultLayout from "@/layouts/default";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoPageShell } from "@/components/seo/page-shell";
import { brokerGuideCta } from "@/components/seo/cta-copy";
import { Skeleton } from "@/components/skeleton";
import { api } from "@/lib/api";
import { badgeLabel, isOfferLive } from "@/lib/brokers";

export default function BrokerCategoryPage() {
  const { category: slug } = useParams<{ category: string }>();
  const category = useMemo(() => categoryBySlug(slug ?? ""), [slug]);
  const [brokers, setBrokers] = useState<BrokerOffer[] | null>(null);
  // Split from `brokers === []` deliberately: an unreachable API and a category
  // that has fallen below the publishing bar are different facts, and telling a
  // reader "we don't have enough platforms" when the network dropped is a
  // statement about our data that isn't true.
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    api
      .brokers("UK")
      .then((all) => live && setBrokers(all))
      .catch((reason) => {
        if (!live) return;
        setErr((reason as Error).message);
        setBrokers([]);
      });

    return () => {
      live = false;
    };
  }, []);

  const ranked = useMemo(
    () => brokersForCategory(category, brokers),
    [category, brokers],
  );

  if (!category) {
    return (
      <DefaultLayout>
        <p className="mx-auto max-w-3xl py-20 text-base text-foreground/65">
          We don’t have a guide for that category.{" "}
          <Link className="underline" to="/brokers">
            See all platforms
          </Link>
          .
        </p>
      </DefaultLayout>
    );
  }

  // Comparisons involving any platform on this page — the most useful onward
  // link we can offer someone still deciding between two of them.
  const related = COMPARISONS.filter((c) =>
    ranked.some((b) => b.slug === c.a || b.slug === c.b),
  ).slice(0, 3);
  const bySlug = new Map((brokers ?? []).map((b) => [b.slug, b]));
  const badge = badgeLabel(category.badge);

  return (
    // hideMobileCta for the same reason broker-detail passes it: on a phone the
    // pinned "Start your free trial" bar sits on top of RankedBroker's
    // full-width Visit button, which is the two-competing-asks case the desktop
    // band already avoids with media: "none". The band at the foot of the page
    // is still the app ask — it just isn't pinned over the affiliate one.
    <DefaultLayout drawerRight hideMobileCta>
      {/* BrokerAside directly rather than SeoRail: the rail's picks are this
          page's own top two, not the site-wide recommendations, so the rail
          agrees with the ranking it sits beside. */}
      <BrokerAside
        showAll
        brokers={brokers}
        ctaVariant="grey"
        heading={badge}
        picks={ranked.slice(0, 2)}
        placement="broker_category_rail"
      />

      <SeoPageShell
        crumbs={[
          { label: "Broker reviews", to: "/brokers" },
          { label: category.h1 },
        ]}
        cta={{
          ...brokerGuideCta,
          gaLabel: `Broker guide · ${category.slug}`,
          marketId: "uk",
          media: "none",
        }}
        eyebrow="Broker guide"
        loading={brokers === null}
        // Above the fold, before any commercial link — and outside the loading
        // boundary, so it is never the thing that arrives late.
        notice={<BrokerDisclosure />}
        skeleton={<CategorySkeleton rows={category.order.length} />}
        standfirst={category.intro[0]}
        standfirstSize="lede"
        title={category.h1}
        width="wide"
      >
        {category.intro.slice(1).map((para) => (
          <p key={para} className={`mt-4 max-w-[64ch] ${R.body}`}>
            {para}
          </p>
        ))}

        {/* Suppressed when the list is empty rather than rendered with a zero
            in it — "we hold 0 UK platforms on file" is a credibility section
            arguing the opposite of its own case. */}
        {(brokers?.length ?? 0) > 0 && (
          <PageSection id="why" title="Why we rank platforms">
            <div className="space-y-3">
              {whyWeRank(brokers!.length).map((para) => (
                <p key={para} className={`max-w-[62ch] ${R.body}`}>
                  {para}
                </p>
              ))}
            </div>
          </PageSection>
        )}

        {err ? (
          <p className={`mt-10 ${R.body}`}>
            We couldn’t load the platform data just now ({err}). Please try
            again shortly, or{" "}
            <Link className="underline" to="/brokers">
              see all platforms
            </Link>
            .
          </p>
        ) : ranked.length < MIN_BROKERS ? (
          // Belt and braces: the sitemap already withholds a category that
          // can't field MIN_BROKERS, but badges are edited in ddbx-data and
          // this page shouldn't render a two-item "comparison" if one is
          // dropped between deploys.
          <p className={`mt-10 ${R.body}`}>
            We don’t have enough platforms on file to publish this comparison
            yet.{" "}
            <Link className="underline" to="/brokers">
              See all platforms
            </Link>
            .
          </p>
        ) : (
          <>
            <PageSection
              aside={
                <p className={`${R.label} leading-[1.6]`}>
                  Every platform here carries our “{badge}” badge — that is what
                  makes it eligible. The order is editorial.
                </p>
              }
              id="picks"
              title="Our ranking"
            >
              <ol className="space-y-3">
                {ranked.map((b, i) => (
                  <RankedBroker
                    key={b.slug}
                    badge={category.badge}
                    broker={b}
                    pick={category.picks[b.slug]}
                    position={i + 1}
                  />
                ))}
              </ol>
              <VerifiedNote brokers={ranked} className="mt-5" />
            </PageSection>

            <PageSection id="compare" title="Side by side">
              <ComparisonTable brokers={ranked} columns={category.columns} />
            </PageSection>
          </>
        )}

        <PageSection id="what-to-look-for" title="What to look for">
          <ul className="space-y-2.5">
            {category.whatToLookFor.map((point) => (
              <li key={point} className={`flex gap-2.5 ${R.body}`}>
                <span
                  aria-hidden
                  className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-foreground/30"
                />
                <span className="max-w-[62ch]">{point}</span>
              </li>
            ))}
          </ul>
        </PageSection>

        {related.length > 0 && (
          <PageSection id="head-to-head" title="Head to head">
            <RelatedCards
              cols={2}
              items={related.map((c) => ({
                to: comparisonPath(c.slug),
                title: c.title,
                description: c.shortVerdict,
                media: <LogoPair a={bySlug.get(c.a)} b={bySlug.get(c.b)} />,
              }))}
            />
          </PageSection>
        )}

        <PageSection id="other-guides" title="Other guides">
          <RelatedCards
            cols={2}
            items={CATEGORIES.filter((c) => c.slug !== category.slug).map(
              (c) => ({
                to: categoryPath(c.slug),
                title: c.h1,
                description: c.description,
              }),
            )}
          />
        </PageSection>

        {/* The affiliate compliance note, in the body for the same reason
            /broker/:slug and /compare put it there: it is a disclosure about
            the commercial links above it, not decoration under the fold. */}
        <BrokerComplianceNote className="mt-10" />
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** One entry in the ranking: position, logo, the authored pick line, the three
 *  charges, and the outbound link. The pick line is the differentiator, so it
 *  gets the weight — the tagline from the API is the fallback when a newly
 *  badged platform has no line written for it yet.
 *
 *  The category badge is chipped on every row, not just the top pick: the page
 *  is titled "best for X", and the badge is the substantiation for that claim
 *  on each platform it's made about. */
function RankedBroker({
  badge,
  broker: b,
  pick,
  position,
}: {
  badge: BrokerBadge;
  broker: BrokerOffer;
  pick?: string;
  position: number;
}) {
  return (
    <li
      className={`${R.sheet} p-4 transition-colors hover:border-brand-brown/25 dark:hover:border-white/[0.16] sm:p-5`}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className={`mt-0.5 w-8 shrink-0 font-mono text-[15px] font-semibold tabular-nums ${
            position <= 3 ? "text-foreground/70" : "text-foreground/35"
          }`}
        >
          {position}
        </span>
        <BrokerLogo broker={b} size={44} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="text-[16px] font-semibold leading-snug tracking-[-0.01em] text-foreground underline-offset-4 hover:underline"
              to={`/brokers/${b.slug}`}
            >
              {b.name}
            </Link>
            {b.badges.includes("top_pick") && <BadgeChip badge="top_pick" />}
            <BadgeChip badge={badge} />
          </div>

          <p className="mt-1.5 max-w-[58ch] text-[14px] leading-[1.6] text-foreground/75">
            {pick ?? b.tagline}
          </p>

          <FeeTiles broker={b} className="mt-3 max-w-[26rem]" />

          {isOfferLive(b) && (
            <OfferBadge className="mt-3" text={b.offer_headline!} />
          )}
        </div>

        <BrokerVisitLink
          broker={b}
          className="hidden shrink-0 sm:inline-flex"
          placement="category_rank"
          variant="secondary"
        >
          Visit
        </BrokerVisitLink>
      </div>

      <BrokerVisitLink
        broker={b}
        className="mt-3 w-full sm:hidden"
        placement="category_rank_mobile"
        variant="secondary"
      />
    </li>
  );
}

/** The category's own columns, not a fixed schema — an ISA page leads on fees
 *  and FX, a funds page on the percentage charge and whether trusts are
 *  available. Scrolls inside its own container so a narrow screen never makes
 *  the page scroll sideways, with the platform name pinned so a scrolled row is
 *  never four unlabelled numbers.
 *
 *  Weight goes on the cheapest cell in the directly-rankable columns only. The
 *  platform fee is excluded on purpose: £4.99/mo and 0.25% don't rank without a
 *  balance to apply them to. */
function ComparisonTable({
  brokers,
  columns,
}: {
  brokers: BrokerOffer[];
  columns: readonly string[];
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className={`border-b ${R.rule}`}>
            <th className={`${R.label} ${STICKY_COL} pb-2 pr-4 font-semibold`}>
              Platform
            </th>
            {columns.map((c) => (
              <th
                key={c}
                className={`${R.label} whitespace-nowrap pb-2 pr-4 font-semibold`}
              >
                <ColHeader help={COLUMN_HELP[c as never]}>
                  {columnLabel(c as never)}
                </ColHeader>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {brokers.map((b) => (
            <tr key={b.slug} className={`border-b ${R.rule} last:border-b-0`}>
              <th
                className={`${STICKY_COL} py-3 pr-4 text-[13.5px] font-medium text-foreground`}
              >
                <Link
                  className="underline-offset-4 hover:underline"
                  to={`/brokers/${b.slug}`}
                >
                  {b.name}
                </Link>
              </th>
              {columns.map((c) => (
                <td
                  key={c}
                  className={`py-3 pr-4 text-[13.5px] tabular-nums ${
                    bestInColumn(c as never, b, brokers)
                      ? "font-semibold text-foreground"
                      : "text-foreground/75"
                  }`}
                >
                  <ColumnValue broker={b} column={c as never} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The loading state at the real geometry: the ranking's own row count (known
 *  without the fetch — `order` is static editorial), then the ruled sections
 *  that follow it. The previous version was four 96px boxes standing in for a
 *  ~1,600px document, so the page redrew rather than filled in. */
function CategorySkeleton({ rows }: { rows: number }) {
  const RULE = `border-t ${R.rule}`;

  return (
    <div aria-busy="true">
      <span className="sr-only">Loading platforms…</span>

      {/* Second intro paragraph. */}
      <div className="mt-4 max-w-[64ch] space-y-2.5">
        <Skeleton className="h-[14px] w-full" />
        <Skeleton className="h-[14px] w-11/12" />
      </div>

      {/* "Why we rank" + "Our ranking", on the PageSection rail grid. */}
      <div
        className={`mt-4 grid gap-x-10 gap-y-4 ${RULE} py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:py-9`}
      >
        <Skeleton className="h-[17px] w-32" />
        <div className="min-w-0 max-w-[62ch] space-y-2.5">
          <Skeleton className="h-[14px] w-full" />
          <Skeleton className="h-[14px] w-10/12" />
        </div>
      </div>

      <div
        className={`grid gap-x-10 gap-y-4 ${RULE} py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:py-9`}
      >
        <Skeleton className="h-[17px] w-24" />
        <div className="min-w-0 space-y-3">
          {Array.from({ length: rows }, (_, i) => (
            <Skeleton key={i} className="w-full rounded-2xl" h={148} />
          ))}
        </div>
      </div>

      {/* Side by side + What to look for. */}
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`grid gap-x-10 gap-y-4 ${RULE} py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:py-9`}
        >
          <Skeleton className="h-[17px] w-24" />
          <Skeleton className="w-full rounded-xl" h={i === 0 ? 200 : 120} />
        </div>
      ))}
    </div>
  );
}
