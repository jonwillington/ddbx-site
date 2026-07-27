/** "X vs Y" — /brokers/compare/:pair.
 *
 *  The pair list, the intro, the one-line answer and the authored verdict live
 *  in shared/broker-comparisons.js so the crawler pre-render can produce
 *  identical words. Six pairs, curated: 19 brokers is 171 possible
 *  combinations, and publishing them all is the doorway-page pattern that would
 *  put the whole /brokers directory at risk.
 *
 *  Four things here that a generated comparison can't do:
 *
 *    1. The differences table hides every field the two platforms agree on.
 *       Both being FSCS protected isn't a comparison, it's filler, and a table
 *       that's 80% identical rows teaches the reader there's nothing to see.
 *    2. The crossover callout solves the flat-fee-versus-percentage question
 *       for the reader's own balance instead of restating the usual rule of
 *       thumb. We hold both fee schedules, so it's arithmetic rather than
 *       opinion.
 *    3. The verdict is written. It's the only part of the page a template
 *       couldn't produce, and it's the reason the page is allowed to exist.
 *    4. "Why this pair" says out loud why these two and not the other 170.
 *
 *  Document order is facts → differences → arithmetic → pros and cons →
 *  verdict → the app band, with the compliance note under all of it. The
 *  verdict used to sit above the pros and cons it's drawn from, so the page
 *  concluded before it finished arguing.
 */
import type { BrokerOffer } from "@/lib/api";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  brokersForComparison,
  comparisonBySlug,
  comparisonPath,
  COMPARISONS,
  feeCrossover,
} from "../../shared/broker-comparisons.js";
import { CATEGORIES, categoryPath } from "../../shared/broker-categories.js";

import {
  BrokerComplianceNote,
  BrokerDisclosure,
  BrokerLogo,
  BrokerVisitLink,
  OfferBadge,
  Tick,
} from "@/components/brokers/broker-ui";
import {
  cheaperInk,
  CostBars,
  FeeTiles,
  LogoPair,
  PageSection,
  R,
  SourceNote,
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
import {
  COST_POTS,
  estAnnualCost,
  fmtMoney,
  fmtMoneyRound,
  fmtPct,
  fmtPotLabel,
  isOfferLive,
  platformFeeSummary,
} from "@/lib/brokers";

/** Every field the comparison can surface, with how to read it off a record.
 *  `same` decides whether a row is worth showing — see DifferencesTable. */
const FIELDS: {
  label: string;
  group: "Costs" | "Accounts" | "What you can hold";
  render: (b: BrokerOffer) => React.ReactNode;
  key: (b: BrokerOffer) => string;
  /** Set only where the two figures are directly rankable and lower is better,
   *  so the cheaper side can carry the weight. Absent on the platform fee: a
   *  monthly amount and a percentage aren't comparable without a balance. */
  cost?: (b: BrokerOffer) => number | null;
}[] = [
  {
    label: "Platform fee",
    group: "Costs",
    render: (b) => platformFeeSummary(b.fees),
    key: (b) => platformFeeSummary(b.fees),
  },
  {
    label: "UK dealing",
    group: "Costs",
    render: (b) => fmtMoney(b.fees.trade_commission_uk_gbp),
    key: (b) => String(b.fees.trade_commission_uk_gbp),
    cost: (b) => b.fees.trade_commission_uk_gbp,
  },
  {
    label: "US dealing",
    group: "Costs",
    render: (b) => fmtMoney(b.fees.trade_commission_us_gbp),
    key: (b) => String(b.fees.trade_commission_us_gbp),
    cost: (b) => b.fees.trade_commission_us_gbp,
  },
  {
    label: "FX fee",
    group: "Costs",
    render: (b) => fmtPct(b.fees.fx_fee_pct),
    key: (b) => String(b.fees.fx_fee_pct),
    cost: (b) => b.fees.fx_fee_pct,
  },
  {
    label: "Stocks & Shares ISA",
    group: "Accounts",
    render: (b) => <Tick value={b.accounts.stocks_isa} />,
    key: (b) => String(b.accounts.stocks_isa),
  },
  {
    label: "SIPP",
    group: "Accounts",
    render: (b) => <Tick value={b.accounts.sipp} />,
    key: (b) => String(b.accounts.sipp),
  },
  {
    label: "Lifetime ISA",
    group: "Accounts",
    render: (b) => <Tick value={b.accounts.lisa} />,
    key: (b) => String(b.accounts.lisa),
  },
  {
    label: "Junior ISA",
    group: "Accounts",
    render: (b) => <Tick value={b.accounts.jisa} />,
    key: (b) => String(b.accounts.jisa),
  },
  {
    label: "UK shares",
    group: "What you can hold",
    render: (b) => <Tick value={b.assets.uk_shares} />,
    key: (b) => String(b.assets.uk_shares),
  },
  {
    label: "US shares",
    group: "What you can hold",
    render: (b) => <Tick value={b.assets.us_shares} />,
    key: (b) => String(b.assets.us_shares),
  },
  {
    label: "Funds",
    group: "What you can hold",
    render: (b) => <Tick value={b.assets.mutual_funds} />,
    key: (b) => String(b.assets.mutual_funds),
  },
  {
    label: "Investment trusts",
    group: "What you can hold",
    render: (b) => <Tick value={b.assets.investment_trusts} />,
    key: (b) => String(b.assets.investment_trusts),
  },
  {
    label: "Fractional shares",
    group: "What you can hold",
    render: (b) => <Tick value={b.assets.fractional_shares} />,
    key: (b) => String(b.assets.fractional_shares),
  },
];

export default function BrokerComparisonPage() {
  const { pair: slug } = useParams<{ pair: string }>();
  const comparison = useMemo(() => comparisonBySlug(slug ?? ""), [slug]);
  const [brokers, setBrokers] = useState<BrokerOffer[] | null>(null);
  // A dropped request and a platform missing from the API are different facts.
  // Collapsing both into "we can't load both platforms" told a reader whose
  // wifi blinked that our data was incomplete.
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

  const pair = useMemo(
    () => brokersForComparison(comparison, brokers),
    [comparison, brokers],
  );

  if (!comparison) {
    return (
      <DefaultLayout>
        <p className="mx-auto max-w-3xl py-20 text-base text-foreground/65">
          We haven’t written that comparison.{" "}
          <Link className="underline" to="/brokers">
            See all platforms
          </Link>
          .
        </p>
      </DefaultLayout>
    );
  }

  const bySlug = new Map((brokers ?? []).map((b) => [b.slug, b]));
  const otherPairs = COMPARISONS.filter((c) => c.slug !== comparison.slug);
  // Guides relevant to THESE two platforms rather than the first three in the
  // list: a Freetrade/Trading 212 reader is served by the beginners and ISA
  // guides, not by "best SIPP providers" because it happens to sort early.
  const relevantGuides = pair
    ? CATEGORIES.filter(
        (c) =>
          pair.a.badges.includes(c.badge) || pair.b.badges.includes(c.badge),
      )
    : CATEGORIES.slice(0, 3);
  // The fallback set isn't "guides these two appear in" — neither platform is
  // in hand in that branch — so the heading has to describe the list it labels.
  const guidesHeading = pair ? "Guides these two appear in" : "Broker guides";

  return (
    // hideMobileCta for the same reason broker-detail passes it: the pinned app
    // bar would sit over the verdict's two Visit buttons on a phone. The
    // terminal band still carries the app ask, unpinned.
    <DefaultLayout drawerRight hideMobileCta>
      {/* The rail carries the two platforms under discussion, not the site's
          general recommendations — on this page they're the only two that
          matter. */}
      <BrokerAside
        showAll
        brokers={brokers}
        ctaVariant="grey"
        heading="The two platforms"
        picks={pair ? [pair.a, pair.b] : undefined}
        placement="broker_comparison_rail"
      />

      <SeoPageShell
        crumbs={[
          { label: "Broker reviews", to: "/brokers" },
          { label: comparison.title },
        ]}
        cta={{
          ...brokerGuideCta,
          gaLabel: `Broker compare · ${comparison.slug}`,
          marketId: "uk",
          media: "none",
        }}
        eyebrow="Broker guide"
        footnote={<BrokerComplianceNote />}
        loading={brokers === null}
        notice={<BrokerDisclosure />}
        skeleton={<ComparisonSkeleton />}
        standfirst={comparison.intro}
        standfirstSize="lede"
        title={comparison.title}
        width="wide"
      >
        {/* The answer, up front. The full verdict is at the foot of the page,
            after the evidence — but a reader who came for "which one" gets it
            in a sentence without scrolling past four sections first. */}
        <div className={`mt-6 ${R.tile} px-5 py-4`}>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan">
            Our verdict
          </p>
          <p className="mt-2 max-w-[62ch] text-[15.5px] font-medium leading-[1.55] tracking-[-0.006em] text-foreground">
            {comparison.shortVerdict}
          </p>
          {/* Only when the section it points at is actually on the page —
              the verdict lives inside the loaded branch. */}
          {pair && (
            <a
              className="mt-2.5 inline-block text-[13px] font-medium text-foreground/55 underline underline-offset-2 transition-colors hover:text-foreground"
              href="#verdict"
            >
              Read the full verdict
            </a>
          )}
        </div>

        {err ? (
          <p className={`mt-10 ${R.body}`}>
            We couldn’t load the platform data just now ({err}). Please try
            again shortly, or{" "}
            <Link className="underline" to="/brokers">
              see all platforms
            </Link>
            .
          </p>
        ) : !pair ? (
          <p className={`mt-10 ${R.body}`}>
            One of these platforms isn’t on file at the moment, so we’re not
            showing a half-populated comparison.{" "}
            <Link className="underline" to="/brokers">
              See all platforms
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <BrokerColumn broker={pair.a} />
              <BrokerColumn broker={pair.b} />
            </div>

            <CrossoverCallout a={pair.a} b={pair.b} />

            <PageSection id="why-this-pair" title="Why this pair">
              <p className={`max-w-[62ch] ${R.body}`}>
                {comparison.whyThisPair}
              </p>
            </PageSection>

            <PageSection id="differences" title="Where they differ">
              <DifferencesTable a={pair.a} b={pair.b} />
              <VerifiedNote brokers={[pair.a, pair.b]} className="mt-5" />
            </PageSection>

            <PageSection id="cost" title="What each costs a year">
              <CostComparison a={pair.a} b={pair.b} />
              <p className={`mt-6 ${R.label} leading-[1.6]`}>
                Illustrative only: a pot built with monthly buys, 12 trades a
                year split evenly between UK and US shares, and half the
                purchases in non-GBP shares incurring the FX fee once on the
                buy. Unknown fees count as zero, and capped or tiered charges
                aren’t modelled.
              </p>
              <SourceNote brokers={[pair.a, pair.b]} className="mt-3" />
            </PageSection>

            <PageSection id="pros-cons" title="Pros and cons">
              <div className="grid gap-6 sm:grid-cols-2">
                <ProsCons broker={pair.a} />
                <ProsCons broker={pair.b} />
              </div>
            </PageSection>

            <PageSection id="verdict" title="Which should you pick">
              <p className={`max-w-[64ch] ${R.body}`}>{comparison.verdict}</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <BrokerVisitLink
                  broker={pair.a}
                  placement="comparison_verdict"
                />
                <BrokerVisitLink
                  broker={pair.b}
                  placement="comparison_verdict"
                  variant="secondary"
                />
              </div>
            </PageSection>
          </>
        )}

        <PageSection id="more" title="More comparisons">
          <p className={R.subhead}>Other head-to-heads</p>
          <RelatedCards
            className="mt-2.5"
            cols={2}
            items={otherPairs.map((c) => ({
              to: comparisonPath(c.slug),
              title: c.title,
              description: c.shortVerdict,
              media: <LogoPair a={bySlug.get(c.a)} b={bySlug.get(c.b)} />,
            }))}
          />

          {/* Both halves gated together: RelatedCards returns null on an empty
              list, so a pair whose platforms carry no category badge used to
              get a heading with nothing under it. */}
          {relevantGuides.length > 0 && (
            <>
              <p className={`mt-7 ${R.subhead}`}>{guidesHeading}</p>
              <RelatedCards
                className="mt-2.5"
                cols={2}
                items={relevantGuides.map((c) => ({
                  to: categoryPath(c.slug),
                  title: c.h1,
                  description: c.description,
                }))}
              />
            </>
          )}
        </PageSection>
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** One side of the pair. Flex column with the CTA pushed to the bottom, so the
 *  two buttons sit on one line whatever the taglines do — an offer badge on one
 *  side used to leave the other's button floating half a card higher. */
function BrokerColumn({ broker: b }: { broker: BrokerOffer }) {
  return (
    <div className={`${R.sheet} flex flex-col p-5`}>
      <div className="flex items-center gap-3">
        <BrokerLogo broker={b} size={40} />
        <Link
          className="text-[17px] font-semibold tracking-[-0.01em] text-foreground underline-offset-4 hover:underline"
          to={`/brokers/${b.slug}`}
        >
          {b.name}
        </Link>
      </div>
      <p className="mt-3 text-[13.5px] leading-[1.6] text-foreground/70">
        {b.tagline}
      </p>

      <FeeTiles broker={b} className="mt-4" />

      {isOfferLive(b) && (
        <OfferBadge className="mt-3" text={b.offer_headline!} />
      )}
      <BrokerVisitLink
        broker={b}
        className="mt-4 w-full"
        placement="comparison_header"
        variant="secondary"
      />
    </div>
  );
}

/** The flat-fee-versus-percentage answer, solved for the reader's balance
 *  rather than quoted as a rule of thumb. Renders nothing unless exactly one
 *  side charges a flat monthly fee and the other a percentage.
 *
 *  The left edge and kicker are what separate it from the affiliate offer
 *  boxes, which wear the same tile fill: this one is arithmetic, not a promo. */
function CrossoverCallout({ a, b }: { a: BrokerOffer; b: BrokerOffer }) {
  const crossover = feeCrossover(a, b);

  if (!crossover) return null;

  return (
    <div
      className={`mt-6 ${R.tile} border-l-2 border-brand-brown/30 px-5 py-4 dark:border-brand-tan/40`}
    >
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan">
        Where it flips
      </p>
      <p className="mt-2 text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
        {crossover.cheaperAbove.name} becomes the cheaper platform at about{" "}
        {fmtMoneyRound(crossover.pot)}.
      </p>
      <p className={`mt-2 max-w-[58ch] ${R.body}`}>
        Below that balance {crossover.cheaperBelow.name}’s percentage charge
        costs less; above it, {crossover.cheaperAbove.name}’s flat monthly fee
        does, and the gap widens as the pot grows. Platform charges only —
        dealing commission and FX depend on how often you trade rather than on
        what you hold.
      </p>
    </div>
  );
}

/** Only the rows where the two platforms actually differ.
 *
 *  A comparison table where most rows match on both sides trains the reader to
 *  stop reading it. Fields are compared on a normalised key rather than the
 *  rendered output, so "—" for two different flavours of unknown still counts
 *  as agreement. If literally nothing differs the section says so rather than
 *  rendering an empty table. */
function DifferencesTable({ a, b }: { a: BrokerOffer; b: BrokerOffer }) {
  const differing = FIELDS.filter((f) => f.key(a) !== f.key(b));

  if (differing.length === 0) {
    return (
      <p className={R.body}>
        On every fee and feature we track, these two platforms are the same. The
        verdict below is about the differences that don’t fit in a table.
      </p>
    );
  }

  const groups = [...new Set(differing.map((f) => f.group))];

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[460px] border-collapse text-left">
        <thead>
          <tr className={`border-b ${R.rule}`}>
            <th
              className={`${R.label} ${STICKY_COL} pb-2 pr-4 font-semibold`}
            />
            <th className="pb-2 pr-4 text-[13px] font-semibold text-foreground">
              {a.name}
            </th>
            <th className="pb-2 text-[13px] font-semibold text-foreground">
              {b.name}
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group}>
              <tr>
                <td className={`${R.subhead} pb-1.5 pt-5`} colSpan={3}>
                  {group}
                </td>
              </tr>
              {differing
                .filter((f) => f.group === group)
                .map((f) => {
                  const ca = f.cost?.(a) ?? null;
                  const cb = f.cost?.(b) ?? null;

                  return (
                    <tr key={f.label} className={`border-b ${R.rule}`}>
                      <th
                        className={`${STICKY_COL} py-2.5 pr-4 text-[13.5px] font-normal text-foreground/60`}
                      >
                        {f.label}
                      </th>
                      <td
                        className={`py-2.5 pr-4 text-[13.5px] tabular-nums ${cheaperInk(ca, cb)}`}
                      >
                        {f.render(a)}
                      </td>
                      <td
                        className={`py-2.5 text-[13.5px] tabular-nums ${cheaperInk(cb, ca)}`}
                      >
                        {f.render(b)}
                      </td>
                    </tr>
                  );
                })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The annual cost at each modelled pot, as the same bar object the reviews
 *  draw — four numbers in a table made the reader do the subtraction, which is
 *  the one thing on this page we can do for them. Each pot is scaled to its own
 *  dearer side, so the gap is the shape you read rather than the pot size.
 *
 *  The delta line is computed, never authored: it's the difference between two
 *  figures rendered directly above it. */
function CostComparison({ a, b }: { a: BrokerOffer; b: BrokerOffer }) {
  return (
    <div className="space-y-6">
      {COST_POTS.map((pot) => {
        const ca = estAnnualCost(a.fees, pot).total;
        const cb = estAnnualCost(b.fees, pot).total;
        const cheaper = ca <= cb ? a : b;
        const gap = Math.abs(ca - cb);

        return (
          <div key={pot}>
            <p className={R.subhead}>
              On {fmtPotLabel(pot)}
              <span className="sr-only"> invested</span>
            </p>
            <CostBars
              className="mt-3"
              rows={[
                { label: a.name, value: ca, primary: ca <= cb },
                { label: b.name, value: cb, primary: cb <= ca },
              ]}
            />
            <p className={`mt-2.5 ${R.label} leading-[1.6]`}>
              {Math.round(gap) === 0
                ? "The two cost about the same at this balance."
                : `${cheaper.name} costs ${fmtMoneyRound(gap)} less a year at this balance.`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ProsCons({ broker: b }: { broker: BrokerOffer }) {
  return (
    <div>
      <h3 className="text-[14px] font-semibold text-foreground">{b.name}</h3>
      <ul className="mt-2.5 space-y-1.5">
        {b.pros.map((p) => (
          <li
            key={p}
            className="flex gap-2 text-[13.5px] leading-[1.55] text-foreground/75"
          >
            <CheckIcon
              className="mt-[4px] h-3.5 w-3.5 shrink-0 text-positive/70"
              strokeWidth={2.5}
            />
            <span>{p}</span>
          </li>
        ))}
        {b.cons.map((c) => (
          <li
            key={c}
            className="flex gap-2 text-[13.5px] leading-[1.55] text-foreground/75"
          >
            <XMarkIcon
              className="mt-[4px] h-3.5 w-3.5 shrink-0 text-negative/70"
              strokeWidth={2.5}
            />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The loading state at the document's real geometry: verdict tile, the two
 *  pair sheets, then the ruled sections on the same 10rem rail grid. The
 *  previous version was ~460px of boxes standing in for ~1,750px of page. */
function ComparisonSkeleton() {
  const RULE = `border-t ${R.rule}`;

  return (
    <div aria-busy="true">
      <span className="sr-only">Loading platforms…</span>

      <Skeleton className="mt-6 w-full rounded-xl" h={116} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Skeleton className="w-full rounded-2xl" h={280} />
        <Skeleton className="w-full rounded-2xl" h={280} />
      </div>

      {[220, 300, 260, 200].map((h, i) => (
        <div
          key={i}
          className={`${i === 0 ? "mt-6" : ""} grid gap-x-10 gap-y-4 ${RULE} py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:py-9`}
        >
          <Skeleton className="h-[17px] w-28" />
          <Skeleton className="w-full rounded-xl" h={h} />
        </div>
      ))}
    </div>
  );
}
