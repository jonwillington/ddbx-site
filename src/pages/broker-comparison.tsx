/** "X vs Y" — /brokers/compare/:pair.
 *
 *  The pair list and the authored verdict live in shared/broker-comparisons.js
 *  so the crawler pre-render can produce identical words. Six pairs, curated:
 *  19 brokers is 171 possible combinations, and publishing them all is the
 *  doorway-page pattern that would put the whole /brokers directory at risk.
 *
 *  Three things here that a generated comparison can't do:
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
 */
import type { BrokerOffer } from "@/lib/api";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
  PageSection,
  R,
  VerifiedNote,
} from "@/components/brokers/broker-page-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { api } from "@/lib/api";
import {
  COST_POTS,
  estAnnualCost,
  fmtMoney,
  fmtMoneyRound,
  fmtPct,
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
  },
  {
    label: "US dealing",
    group: "Costs",
    render: (b) => fmtMoney(b.fees.trade_commission_us_gbp),
    key: (b) => String(b.fees.trade_commission_us_gbp),
  },
  {
    label: "FX fee",
    group: "Costs",
    render: (b) => fmtPct(b.fees.fx_fee_pct),
    key: (b) => String(b.fees.fx_fee_pct),
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

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId="uk"
        placement="broker_comparison_rail"
        ukHeading="Top picks"
      />
      <article className="mx-auto w-full max-w-[860px] pb-16">
        <nav className={`${R.label} pt-2`}>
          <Link className="hover:text-foreground/70" to="/brokers">
            UK platforms
          </Link>
          <span className="mx-1.5 opacity-40">/</span>
          <span>{comparison.title}</span>
        </nav>

        <h1 className="mt-5 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[38px]">
          {comparison.title}
        </h1>

        <BrokerDisclosure className="mt-6" />

        <p className={`mt-6 max-w-[64ch] ${R.body}`}>{comparison.intro}</p>

        {brokers === null ? (
          <ComparisonSkeleton />
        ) : !pair ? (
          <p className={`mt-10 ${R.body}`}>
            We can’t load both platforms right now.{" "}
            <Link className="underline" to="/brokers">
              See all platforms
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <BrokerColumn broker={pair.a} />
              <BrokerColumn broker={pair.b} />
            </div>

            <CrossoverCallout a={pair.a} b={pair.b} />

            <PageSection id="differences" title="Where they differ">
              <DifferencesTable a={pair.a} b={pair.b} />
              <VerifiedNote brokers={[pair.a, pair.b]} className="mt-5" />
            </PageSection>

            <PageSection id="cost" title="What each costs a year">
              <CostTable a={pair.a} b={pair.b} />
              <p className={`mt-4 ${R.label} leading-[1.6]`}>
                Illustrative only: a pot built with monthly buys, 12 trades a
                year split evenly between UK and US shares, and half the
                purchases in non-GBP shares incurring the FX fee once on the
                buy. Unknown fees count as zero, and capped or tiered charges
                aren’t modelled.
              </p>
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

            <PageSection id="pros-cons" title="Pros and cons">
              <div className="grid gap-6 sm:grid-cols-2">
                <ProsCons broker={pair.a} />
                <ProsCons broker={pair.b} />
              </div>
            </PageSection>
          </>
        )}

        <PageSection id="more" title="More comparisons">
          <ul className="space-y-1.5">
            {COMPARISONS.filter((c) => c.slug !== comparison.slug).map((c) => (
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
          <ul className="mt-4 space-y-1.5">
            {CATEGORIES.slice(0, 3).map((c) => (
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

function BrokerColumn({ broker: b }: { broker: BrokerOffer }) {
  return (
    <div className={`${R.sheet} p-5`}>
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
 *  side charges a flat monthly fee and the other a percentage. */
function CrossoverCallout({ a, b }: { a: BrokerOffer; b: BrokerOffer }) {
  const crossover = feeCrossover(a, b);

  if (!crossover) return null;

  return (
    <div className={`mt-6 ${R.tile} px-5 py-4`}>
      <p className="text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
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
              className={`${R.label} pb-2 pr-4 font-semibold uppercase tracking-[0.1em]`}
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
                <td
                  className={`${R.label} pb-1.5 pt-5 font-semibold uppercase tracking-[0.1em]`}
                  colSpan={3}
                >
                  {group}
                </td>
              </tr>
              {differing
                .filter((f) => f.group === group)
                .map((f) => (
                  <tr key={f.label} className={`border-b ${R.rule}`}>
                    <th className="py-2.5 pr-4 text-[13.5px] font-normal text-foreground/60">
                      {f.label}
                    </th>
                    <td className="py-2.5 pr-4 text-[13.5px] tabular-nums text-foreground/85">
                      {f.render(a)}
                    </td>
                    <td className="py-2.5 text-[13.5px] tabular-nums text-foreground/85">
                      {f.render(b)}
                    </td>
                  </tr>
                ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CostTable({ a, b }: { a: BrokerOffer; b: BrokerOffer }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[420px] border-collapse text-left">
        <thead>
          <tr className={`border-b ${R.rule}`}>
            <th
              className={`${R.label} pb-2 pr-4 font-semibold uppercase tracking-[0.1em]`}
            >
              Pot
            </th>
            <th className="pb-2 pr-4 text-[13px] font-semibold text-foreground">
              {a.name}
            </th>
            <th className="pb-2 text-[13px] font-semibold text-foreground">
              {b.name}
            </th>
          </tr>
        </thead>
        <tbody>
          {COST_POTS.map((pot) => {
            const ca = estAnnualCost(a.fees, pot).total;
            const cb = estAnnualCost(b.fees, pot).total;

            return (
              <tr key={pot} className={`border-b ${R.rule} last:border-b-0`}>
                <th className="py-3 pr-4 text-[13.5px] font-medium tabular-nums text-foreground">
                  {fmtMoneyRound(pot)}
                </th>
                <td
                  className={`py-3 pr-4 text-[13.5px] tabular-nums ${ca <= cb ? "font-semibold text-foreground" : "text-foreground/65"}`}
                >
                  {fmtMoneyRound(ca)}
                </td>
                <td
                  className={`py-3 text-[13.5px] tabular-nums ${cb <= ca ? "font-semibold text-foreground" : "text-foreground/65"}`}
                >
                  {fmtMoneyRound(cb)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
            <span aria-hidden className="text-foreground/40">
              +
            </span>
            <span>{p}</span>
          </li>
        ))}
        {b.cons.map((c) => (
          <li
            key={c}
            className="flex gap-2 text-[13.5px] leading-[1.55] text-foreground/75"
          >
            <span aria-hidden className="text-foreground/40">
              −
            </span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonSkeleton() {
  return (
    <div className="mt-8 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-48 rounded-2xl bg-foreground/[0.06]" />
        <div className="h-48 rounded-2xl bg-foreground/[0.06]" />
      </div>
      <div className="mt-8 h-64 rounded-2xl bg-foreground/[0.06]" />
    </div>
  );
}
