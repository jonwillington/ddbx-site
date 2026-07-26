/** "Best UK platforms for X" — /brokers/best-for/:category.
 *
 *  The editorial content (which brokers, in what order, and the one-line pick
 *  for each) lives in shared/broker-categories.js, because the crawler
 *  pre-render at functions/brokers/best-for/[category].js has to render the
 *  same words and can't import from src/.
 *
 *  What this page deliberately is NOT: a filtered list. Roughly half the UK
 *  brokers we hold carry `best_for_beginners`, so a badge filter alone
 *  produces most of the market in arbitrary order — a query result rather than
 *  a recommendation. The badge decides eligibility; the module's `order`
 *  decides the ranking; and each entry carries a sentence saying who it's for
 *  and how it differs from the one above. That sentence is the page.
 *
 *  Compliance posture matches the rest of /brokers: the affiliate disclosure
 *  sits above the fold rather than in the footer, outbound links carry
 *  rel="sponsored" via BrokerVisitLink, expired incentives are suppressed by
 *  isOfferLive(), and the ranking methodology plus the standard risk
 *  disclaimers close the page.
 */
import type { BrokerOffer } from "@/lib/api";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  brokersForCategory,
  categoryBySlug,
  categoryPath,
  CATEGORIES,
  MIN_BROKERS,
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
  ColumnValue,
  columnLabel,
  PageSection,
  R,
  VerifiedNote,
} from "@/components/brokers/broker-page-ui";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { isOfferLive } from "@/lib/brokers";

export default function BrokerCategoryPage() {
  const { category: slug } = useParams<{ category: string }>();
  const category = useMemo(() => categoryBySlug(slug ?? ""), [slug]);
  const [brokers, setBrokers] = useState<BrokerOffer[] | null>(null);

  useEffect(() => {
    let live = true;

    api
      .brokers("UK")
      .then((all) => live && setBrokers(all))
      .catch(() => live && setBrokers([]));

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

  return (
    <DefaultLayout>
      <article className="mx-auto w-full max-w-[860px] pb-16">
        <nav className={`${R.label} pt-2`}>
          <Link className="hover:text-foreground/70" to="/brokers">
            UK platforms
          </Link>
          <span className="mx-1.5 opacity-40">/</span>
          <span>{category.h1}</span>
        </nav>

        <h1 className="mt-5 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[38px]">
          {category.h1}
        </h1>

        {/* Above the fold, before any commercial link — not in the footer. */}
        <BrokerDisclosure className="mt-6" />

        <div className="mt-6 space-y-4">
          {category.intro.map((para) => (
            <p key={para} className={`max-w-[64ch] ${R.body}`}>
              {para}
            </p>
          ))}
        </div>

        {brokers === null ? (
          <CategorySkeleton />
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
            <PageSection id="picks" title="Our ranking">
              <ol className="space-y-3">
                {ranked.map((b, i) => (
                  <RankedBroker
                    key={b.slug}
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
            <ul className="space-y-1.5">
              {related.map((c) => (
                <li key={c.slug}>
                  <Link
                    className="text-[14.5px] text-foreground/85 underline-offset-4 hover:underline"
                    to={comparisonPath(c.slug)}
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </PageSection>
        )}

        <PageSection id="other-guides" title="Other guides">
          <ul className="space-y-1.5">
            {CATEGORIES.filter((c) => c.slug !== category.slug).map((c) => (
              <li key={c.slug}>
                <Link
                  className="text-[14.5px] text-foreground/85 underline-offset-4 hover:underline"
                  to={categoryPath(c.slug)}
                >
                  {c.h1}
                </Link>
              </li>
            ))}
          </ul>
        </PageSection>

        <div className={`mt-10 border-t ${R.rule} pt-6`}>
          <BrokerComplianceNote />
        </div>
      </article>
    </DefaultLayout>
  );
}

/** One entry in the ranking: position, logo, the authored pick line, and the
 *  outbound link. The pick line is the differentiator, so it gets the weight —
 *  the tagline from the API is the fallback when a newly badged platform has
 *  no line written for it yet. */
function RankedBroker({
  broker: b,
  pick,
  position,
}: {
  broker: BrokerOffer;
  pick?: string;
  position: number;
}) {
  return (
    <li className={`${R.sheet} p-4 sm:p-5`}>
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="mt-0.5 w-5 shrink-0 font-mono text-[13px] font-semibold tabular-nums text-foreground/35"
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
          </div>

          <p className="mt-1.5 max-w-[58ch] text-[14px] leading-[1.6] text-foreground/75">
            {pick ?? b.tagline}
          </p>

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
 *  the page scroll sideways. */
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
            <th
              className={`${R.label} pb-2 pr-4 font-semibold uppercase tracking-[0.1em]`}
            >
              Platform
            </th>
            {columns.map((c) => (
              <th
                key={c}
                className={`${R.label} whitespace-nowrap pb-2 pr-4 font-semibold uppercase tracking-[0.1em]`}
              >
                {columnLabel(c as never)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {brokers.map((b) => (
            <tr key={b.slug} className={`border-b ${R.rule} last:border-b-0`}>
              <th className="py-3 pr-4 text-[13.5px] font-medium text-foreground">
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
                  className="py-3 pr-4 text-[13.5px] tabular-nums text-foreground/75"
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

function CategorySkeleton() {
  return (
    <div className="mt-10 animate-pulse space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-2xl bg-foreground/[0.06]" />
      ))}
    </div>
  );
}
