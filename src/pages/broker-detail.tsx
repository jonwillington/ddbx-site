import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import {
  BrokerComplianceNote,
  BrokerDisclosure,
  BrokerLogo,
  BrokerVisitLink,
  OfferBadge,
  StarRating,
} from "@/components/brokers/broker-ui";
import { BUTTON_SELECTED } from "@/components/button";
import DefaultLayout from "@/layouts/default";
import { api, type BrokerOffer } from "@/lib/api";
import {
  COST_POTS,
  brandTint,
  estAnnualCost,
  fmtMoney,
  fmtMoneyRound,
  fmtPct,
  fmtVerifiedDate,
  platformFeeSummary,
  sourceLabel,
} from "@/lib/brokers";

type Fact = { label: string; value: React.ReactNode };

export default function BrokerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [brokers, setBrokers] = useState<BrokerOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .brokers("UK")
      .then(setBrokers)
      .catch((reason) => setError((reason as Error).message));
  }, []);

  const broker = useMemo(
    () => brokers?.find((item) => item.slug === slug) ?? null,
    [brokers, slug],
  );

  if (error) {
    return (
      <DefaultLayout>
        <PageMessage>
          Couldn’t load this review ({error}). <a href="/brokers">See all brokers</a>.
        </PageMessage>
      </DefaultLayout>
    );
  }

  if (!brokers) {
    return (
      <DefaultLayout>
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="h-4 w-40 rounded bg-foreground/10" />
          <div className="mt-12 h-72 rounded-[2rem] bg-surface" />
          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-4">
              <div className="h-6 w-full rounded bg-foreground/10" />
              <div className="h-6 w-5/6 rounded bg-foreground/10" />
              <div className="h-48 rounded bg-surface" />
            </div>
            <div className="h-80 rounded-2xl bg-surface" />
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (!broker) {
    return (
      <DefaultLayout>
        <PageMessage>
          We don’t have a review for that platform.{" "}
          <a href="/brokers">See all brokers</a>.
        </PageMessage>
      </DefaultLayout>
    );
  }

  return <BrokerReview broker={broker} brokers={brokers} />;
}

function PageMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto max-w-3xl py-20 text-base text-foreground/65 [&_a]:underline">
      {children}
    </p>
  );
}

function BrokerReview({
  broker: b,
  brokers,
}: {
  broker: BrokerOffer;
  brokers: BrokerOffer[];
}) {
  const heroFacts: Fact[] = [
    { label: "Platform fee", value: platformFeeSummary(b.fees) },
    { label: "UK trades", value: fmtMoney(b.fees.trade_commission_uk_gbp) },
    { label: "FX fee", value: fmtPct(b.fees.fx_fee_pct) },
    {
      label: "Accounts",
      value:
        [b.accounts.stocks_isa && "ISA", b.accounts.sipp && "SIPP"]
          .filter(Boolean)
          .join(" + ") || "General",
    },
  ];
  const faqs = makeFaqs(b);
  const related = brokers.filter((item) => item.slug !== b.slug).slice(0, 5);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <DefaultLayout hideMobileCta>
      <div className="mx-auto max-w-[1120px] pb-24 lg:pb-16">
        <nav className="text-sm text-foreground/50" aria-label="Breadcrumb">
          <a
            className="transition-colors hover:text-foreground"
            href="/brokers"
          >
            Broker reviews
          </a>
          <span className="mx-2 text-foreground/25">/</span>
          <span className="text-foreground/75">{b.name}</span>
        </nav>

        <ReviewHeader broker={b} facts={heroFacts} />

        <div className="mt-12 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
          <article className="min-w-0">
            <section>
              <p className="text-lg leading-relaxed text-foreground/90 sm:text-xl">
                {b.summary}
              </p>
              <ProsAndCons broker={b} />
            </section>

            <CostSection broker={b} brokers={brokers} />

            <PlatformSection broker={b} />

            {b.offer_headline && (
              <section
                className="scroll-mt-24 border-y border-separator py-8"
                id="offer"
              >
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
                  Current offer
                </p>
                <h2 className="max-w-xl text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
                  {b.offer_headline}
                </h2>
                {b.offer_terms && (
                  <details className="group mt-4">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-foreground/55 hover:text-foreground [&::-webkit-details-marker]:hidden">
                      <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
                      Read the terms
                    </summary>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/65">
                      {b.offer_terms}
                    </p>
                  </details>
                )}
              </section>
            )}

            {faqs.length > 0 && (
              <section className="scroll-mt-24 py-12" id="faq">
                <SectionHeading eyebrow="The details">
                  Questions about {b.name}
                </SectionHeading>
                <div className="mt-6 border-t border-separator">
                  {faqs.map((item) => (
                    <details
                      key={item.question}
                      className="group border-b border-separator"
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 font-medium text-foreground/90 [&::-webkit-details-marker]:hidden">
                        {item.question}
                        <ChevronDownIcon className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="max-w-2xl pb-5 text-sm leading-6 text-foreground/65">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
                <script
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify(faqJsonLd),
                  }}
                  type="application/ld+json"
                />
              </section>
            )}

            <SourceNote broker={b} />

            {related.length > 0 && (
              <nav className="mt-12 border-t border-separator pt-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
                  More broker reviews
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                  {related.map((item) => (
                    <a
                      key={item.slug}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
                      href={`/brokers/${item.slug}`}
                    >
                      {item.name}
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              </nav>
            )}

            <BrokerComplianceNote className="mt-12 border-t border-separator pt-8" />
          </article>

          <VerdictRail broker={b} />
        </div>
      </div>

      <MobileVisitBar broker={b} />
    </DefaultLayout>
  );
}

function ReviewHeader({ broker: b, facts }: { broker: BrokerOffer; facts: Fact[] }) {
  const tint = brandTint(b.brand_color, 0.16);
  const tintQuiet = brandTint(b.brand_color, 0.035);

  return (
    <header
      className="relative mt-6 overflow-hidden rounded-[2rem] border border-separator px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12"
      style={{
        background: tint
          ? `linear-gradient(135deg, ${tint}, ${tintQuiet} 58%, transparent 88%)`
          : undefined,
      }}
    >
      <div className="relative max-w-4xl">
        <div className="mb-9 flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/50">
            ddbx review · Updated {fmtVerifiedDate(b.last_verified)}
          </p>
          <BrokerLogo broker={b} size={64} />
        </div>

        <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-7xl">
          {b.name}
        </h1>
        <p className="mt-5 max-w-3xl text-xl leading-snug text-foreground/75 sm:text-2xl">
          {b.tagline}
        </p>
        <RatingsLine broker={b} />

        <dl className="mt-10 grid grid-cols-2 border-t border-foreground/15 sm:grid-cols-4">
          {facts.map((fact, index) => (
            <div
              key={fact.label}
              className={`py-4 ${index % 2 === 0 ? "pr-4" : "border-l border-foreground/15 pl-4"} sm:border-l sm:border-foreground/15 sm:px-5 sm:first:border-l-0 sm:first:pl-0`}
            >
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
                {fact.label}
              </dt>
              <dd className="mt-1 text-lg font-semibold tracking-tight text-foreground/90">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

function RatingsLine({ broker: b }: { broker: BrokerOffer }) {
  const ratings = [
    { label: "App Store", value: b.trust.app_store_rating },
    { label: "Google Play", value: b.trust.play_store_rating },
    { label: "Trustpilot", value: b.trust.trustpilot_rating },
  ].filter(
    (item): item is { label: string; value: number } => item.value != null,
  );

  if (!ratings.length) return null;

  const average =
    ratings.reduce((total, item) => total + item.value, 0) / ratings.length;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
      <StarRating value={average} />
      <span className="text-xs text-foreground/50">
        {ratings
          .map((item) => `${item.label} ${item.value.toFixed(1)}`)
          .join(" · ")}
      </span>
    </div>
  );
}

function ProsAndCons({ broker: b }: { broker: BrokerOffer }) {
  return (
    <div className="my-12 grid border-y border-separator sm:grid-cols-2">
      <div className="py-7 sm:pr-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          Why we rate it
        </h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-foreground/75">
          {b.pros.map((item) => (
            <li key={item} className="flex gap-3">
              <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-separator py-7 sm:border-l sm:border-t-0 sm:pl-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a74f34] dark:text-[#e6997d]">
          What holds it back
        </h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-foreground/75">
          {b.cons.map((item) => (
            <li key={item} className="flex gap-3">
              <XMarkIcon className="mt-1 h-4 w-4 shrink-0 text-[#b75b3d] dark:text-[#e6997d]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function VerdictRail({ broker: b }: { broker: BrokerOffer }) {
  return (
    <aside className="hidden lg:sticky lg:top-24 lg:block">
      <div className="border-t-2 border-foreground px-1 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/45">
          The verdict
        </p>
        <p className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-foreground">
          Best for
        </p>
        <p className="mt-1 text-sm leading-6 text-foreground/70">{b.tagline}</p>

        {b.offer_headline && (
          <OfferBadge className="mt-5" text={b.offer_headline} />
        )}

        <BrokerVisitLink
          broker={b}
          className="mt-5 w-full"
          placement="verdict"
          size="lg"
        />
        <p className="mt-2 text-center text-[10px] leading-4 text-foreground/45">
          Capital at risk. We may earn a commission.
        </p>

        <dl className="mt-6 border-t border-separator pt-4 text-sm">
          <RailFact label="ISA" value={b.accounts.stocks_isa ? "Yes" : "No"} />
          <RailFact label="SIPP" value={b.accounts.sipp ? "Yes" : "No"} />
          <RailFact
            label="FSCS protection"
            value={b.trust.fscs_protected ? "Up to £85k" : "Not listed"}
          />
          {b.trust.regulator && (
            <RailFact label="Regulated by" value={b.trust.regulator} />
          )}
        </dl>
        <BrokerDisclosure className="mt-5 !border-0 !bg-transparent !p-0 !text-[11px] !leading-4" />
      </div>
    </aside>
  );
}

function RailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-separator/70 py-2.5">
      <dt className="text-foreground/50">{label}</dt>
      <dd className="text-right font-medium text-foreground/80">{value}</dd>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {children}
      </h2>
    </div>
  );
}

function CostSection({
  broker: b,
  brokers,
}: {
  broker: BrokerOffer;
  brokers: BrokerOffer[];
}) {
  const [pot, setPot] = useState<number>(COST_POTS[1]);
  const mine = estAnnualCost(b.fees, pot);
  const rivals = brokers
    .filter((item) => item.slug !== b.slug)
    .map((item) => ({
      name: item.name,
      total: estAnnualCost(item.fees, pot).total,
    }));
  const average =
    rivals.reduce((total, item) => total + item.total, 0) / rivals.length;
  const cheapest = rivals.reduce((best, item) =>
    item.total < best.total ? item : best,
  );
  const rows = [
    { label: b.name, total: mine.total, primary: true },
    { label: "Broker average", total: average, primary: false },
    { label: `Cheapest alternative · ${cheapest.name}`, total: cheapest.total, primary: false },
  ];
  const max = Math.max(...rows.map((row) => row.total), 1);

  return (
    <section className="scroll-mt-24 py-12" id="costs">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <SectionHeading eyebrow="Fees">What it costs</SectionHeading>
        <div className="inline-flex rounded-lg bg-foreground/[0.06] p-0.5">
          {COST_POTS.map((value) => (
            <button
              key={value}
              className={
                pot === value
                  ? `rounded-md ${BUTTON_SELECTED} px-3 py-1.5 text-xs font-medium`
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-foreground/55 hover:text-foreground"
              }
              type="button"
              onClick={() => setPot(value)}
            >
              £{value >= 1000 ? `${value / 1000}k` : value}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 border-y border-separator py-7">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            {fmtMoneyRound(mine.total)}
          </span>
          <span className="text-sm text-foreground/55">
            estimated each year on £{pot.toLocaleString("en-GB")}
          </span>
        </div>
        <p className="mt-2 text-xs text-foreground/45">
          {fmtMoneyRound(mine.platform)} platform ·{" "}
          {fmtMoneyRound(mine.dealing)} dealing · {fmtMoneyRound(mine.fx)} FX
        </p>

        <div className="mt-8 space-y-5">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-2 flex justify-between gap-4 text-xs">
                <span
                  className={
                    row.primary
                      ? "font-semibold text-foreground"
                      : "text-foreground/55"
                  }
                >
                  {row.label}
                </span>
                <span className="font-medium tabular-nums text-foreground/75">
                  {fmtMoneyRound(row.total)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
                <div
                  className={
                    row.primary
                      ? "h-full rounded-full bg-[#5a4128] dark:bg-[#d8c4af]"
                      : "h-full rounded-full bg-foreground/25"
                  }
                  style={{
                    width: `${Math.max((row.total / max) * 100, 1.5)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <details className="group mt-7 border-t border-separator/70 pt-4">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-foreground/65 hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
            Full fee schedule and methodology
          </summary>
          <FeeSchedule broker={b} />
        </details>
      </div>
    </section>
  );
}

function FeeSchedule({ broker: b }: { broker: BrokerOffer }) {
  const rows = [
    ["Charging model", b.fees.fee_model],
    ["Platform fee", platformFeeSummary(b.fees)],
    ["UK share trade", fmtMoney(b.fees.trade_commission_uk_gbp)],
    ["US share trade", fmtMoney(b.fees.trade_commission_us_gbp)],
    ["Fund dealing", fmtMoney(b.fees.fund_dealing_gbp)],
    ["FX fee", fmtPct(b.fees.fx_fee_pct)],
    ["Minimum deposit", fmtMoney(b.fees.min_deposit_gbp)],
    ["Inactivity fee", b.fees.inactivity_fee_note],
  ].filter((row) => row[1] != null);

  return (
    <div className="mt-4">
      <dl className="divide-y divide-separator/60 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6 py-3">
            <dt className="text-foreground/55">{label}</dt>
            <dd className="text-right font-medium text-foreground/80">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[11px] leading-5 text-foreground/45">
        Estimate assumes 12 monthly purchases, split equally between UK and US
        shares. FX applies to the overseas half. Subscription tiers, fee caps
        and fund charges are not modelled.
      </p>
    </div>
  );
}

function PlatformSection({ broker: b }: { broker: BrokerOffer }) {
  const groups = [
    {
      label: "Accounts",
      items: [
        ["General investment account", b.accounts.gia],
        ["Stocks & Shares ISA", b.accounts.stocks_isa],
        ["SIPP", b.accounts.sipp],
        ["Lifetime ISA", b.accounts.lisa],
        ["Junior ISA", b.accounts.jisa],
      ] as [string, boolean | null][],
    },
    {
      label: "Investments",
      items: [
        ["UK shares", b.assets.uk_shares],
        ["US shares", b.assets.us_shares],
        ["Global shares", b.assets.global_shares],
        ["ETFs", b.assets.etfs],
        ["Funds", b.assets.mutual_funds],
        ["Investment trusts", b.assets.investment_trusts],
        ["Fractional shares", b.assets.fractional_shares],
        ["Bonds & gilts", b.assets.bonds_gilts],
      ] as [string, boolean | null][],
    },
    {
      label: "Features",
      items: [
        ["Auto-invest", b.trust.auto_invest],
        ["Dividend reinvestment", b.trust.dividend_reinvestment],
        ["Interest on cash", b.trust.interest_on_cash],
        ["Web platform", b.trust.web_platform],
        ["Mobile app", b.trust.mobile_app],
      ] as [string, boolean | null][],
    },
  ];

  return (
    <section className="scroll-mt-24 pb-12" id="platform">
      <SectionHeading eyebrow="At a glance">The platform</SectionHeading>
      <div className="mt-7 border-t border-separator">
        {groups.map((group) => (
          <div
            key={group.label}
            className="grid gap-4 border-b border-separator py-6 sm:grid-cols-[8rem_1fr]"
          >
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/45">
              {group.label}
            </h3>
            <ul className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
              {group.items
                .filter(([, value]) => value != null)
                .map(([label, value]) => (
                  <li
                    key={label}
                    className={
                      value
                        ? "flex items-center gap-2 text-foreground/80"
                        : "flex items-center gap-2 text-foreground/35"
                    }
                  >
                    {value ? (
                      <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        —
                      </span>
                    )}
                    {label}
                  </li>
                ))}
            </ul>
          </div>
        ))}

        <div className="grid gap-4 border-b border-separator py-6 sm:grid-cols-[8rem_1fr]">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/45">
            Protection
          </h3>
          <div className="flex items-start gap-3 text-sm leading-6 text-foreground/75">
            <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-foreground/45" />
            <p>
              {b.trust.fscs_protected
                ? "FSCS protected up to £85,000"
                : "Not listed as FSCS protected"}
              {b.trust.regulator ? ` · ${b.trust.regulator} regulated` : ""}
              {b.trust.year_founded ? ` · Founded ${b.trust.year_founded}` : ""}
              {b.trust.headquarters ? ` · ${b.trust.headquarters}` : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SourceNote({ broker: b }: { broker: BrokerOffer }) {
  if (!b.sources?.length) return null;

  const sources = [...new Map(b.sources.map((source) => [sourceLabel(source), source]))];

  return (
    <p className="text-xs leading-5 text-foreground/45">
      <span className="font-semibold uppercase tracking-[0.14em]">Sources </span>
      {sources.map(([label, source], index) => (
        <span key={label}>
          <a
            className="underline underline-offset-2 hover:text-foreground/70"
            href={source}
            rel="noopener noreferrer"
            target="_blank"
          >
            {label}
          </a>
          {index < sources.length - 1 ? " · " : ""}
        </span>
      ))}
      . Checked {fmtVerifiedDate(b.last_verified)}. Always confirm current terms
      with {b.name}.
    </p>
  );
}

function MobileVisitBar({ broker: b }: { broker: BrokerOffer }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-separator bg-background/95 px-4 py-3 backdrop-blur lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <BrokerLogo broker={b} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {b.name}
          </p>
          <p className="truncate text-[11px] text-foreground/50">
            {platformFeeSummary(b.fees)} platform fee
          </p>
        </div>
        <BrokerVisitLink broker={b} placement="mobile_bar" />
      </div>
    </div>
  );
}

function makeFaqs(b: BrokerOffer) {
  return [
    {
      question: `Does ${b.name} offer a Stocks & Shares ISA?`,
      answer: b.accounts.stocks_isa
        ? `Yes. ${b.name} offers a Stocks & Shares ISA.${b.accounts.isa_note ? ` ${b.accounts.isa_note}` : ""}`
        : `No. ${b.name} does not currently offer a Stocks & Shares ISA.`,
    },
    {
      question: `Does ${b.name} offer a SIPP?`,
      answer: b.accounts.sipp
        ? `Yes. ${b.name} offers a self-invested personal pension.${b.accounts.sipp_note ? ` ${b.accounts.sipp_note}` : ""}`
        : `No. ${b.name} does not currently offer a SIPP.`,
    },
    {
      question: `Is ${b.name} FSCS protected?`,
      answer: b.trust.fscs_protected
        ? `Yes. Eligible money and investments held with ${b.name} are protected by the FSCS up to £85,000 if the firm fails.`
        : `${b.name} is not listed as FSCS protected. Check the provider for current details.`,
    },
    {
      question: `How much does ${b.name} charge?`,
      answer: `${b.name}’s platform fee is ${platformFeeSummary(b.fees)}. UK share trades cost ${fmtMoney(b.fees.trade_commission_uk_gbp)}, with an FX fee of ${fmtPct(b.fees.fx_fee_pct)} on overseas trades.`,
    },
    {
      question: `Can I buy fractional shares with ${b.name}?`,
      answer: b.assets.fractional_shares
        ? `Yes. ${b.name} offers fractional shares.`
        : `No. ${b.name} does not currently offer fractional shares.`,
    },
  ];
}
