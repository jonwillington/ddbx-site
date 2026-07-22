import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  GiftIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { BrokerNavAside } from "@/components/brokers/broker-aside";
import {
  BrokerComplianceNote,
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
  estAnnualCost,
  fmtMoney,
  fmtMoneyRound,
  fmtPct,
  fmtVerifiedDate,
  platformFeeSummary,
  sourceLabel,
} from "@/lib/brokers";

type Fact = { label: string; value: React.ReactNode };

/**
 * Shared review language — one system for every article block.
 *
 *  Eyebrow   → brand brown, mono-adjacent tracking (site identity)
 *  Title     → large, tight tracking, high contrast
 *  Body      → 15/27 soft ink, comfortable measure
 *  Surface   → soft warm wash when a block needs isolation
 *  Accent    → #5a4128 (ddbx brown); broker brand_color only on the hero tick
 *
 * Keep chrome (rail, sticky buy panel) alone — this vocabulary is for the
 * article column only.
 */
const R = {
  eyebrow:
    "text-[11px] font-bold uppercase tracking-[0.16em] text-[#5a4128] dark:text-[#d8c4af]",
  title:
    "text-[26px] font-bold leading-[1.15] tracking-[-0.022em] text-foreground sm:text-[28px]",
  body: "text-[15px] leading-7 text-foreground/75",
  wash: "rounded-2xl bg-[#5a4128]/[0.055] dark:bg-[#d8c4af]/[0.09]",
  rule: "border-[#e8e0d5] dark:border-separator",
  brandFill: "bg-[#5a4128] dark:bg-[#d8c4af]",
  brandSoft: "bg-[#5a4128]/[0.10] dark:bg-[#d8c4af]/[0.16]",
  brandText: "text-[#5a4128] dark:text-[#d8c4af]",
} as const;

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
          Couldn’t load this review ({error}).{" "}
          <a href="/brokers">See all brokers</a>.
        </PageMessage>
      </DefaultLayout>
    );
  }

  if (!brokers) {
    return (
      <DefaultLayout drawerRight>
        <div className="mx-auto w-full max-w-[760px] animate-pulse">
          <div className="h-4 w-48 rounded bg-foreground/10" />
          <div className="mt-8 h-12 w-3/4 rounded bg-foreground/10" />
          <div className="mt-4 h-5 w-2/3 rounded bg-foreground/10" />
          <div className="mt-8 h-20 rounded bg-surface" />
          <div className="mt-8 space-y-3">
            <div className="h-5 w-full rounded bg-foreground/10" />
            <div className="h-5 w-5/6 rounded bg-foreground/10" />
            <div className="h-48 rounded bg-surface" />
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
  // The sticky panel repeats the logo + name from the page header, which
  // looks duplicated while both are on screen. Watch the header and only
  // reveal the panel's identity row once it has scrolled out from under the
  // sticky offset (top-24 = 96px).
  const headerRef = useRef<HTMLDivElement>(null);
  const [pastHeader, setPastHeader] = useState(false);

  useEffect(() => {
    const el = headerRef.current;

    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setPastHeader(!entry.isIntersecting),
      { rootMargin: "-96px 0px 0px 0px" },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

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
    <DefaultLayout drawerRight hideMobileCta>
      <BrokerNavAside brokers={brokers} current={b} />

      <div className="mx-auto w-full max-w-[1040px] pb-24 lg:pb-14">
        <div ref={headerRef}>
          <ReviewHeader broker={b} facts={heroFacts} />
        </div>

        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <article className="min-w-0 max-w-[760px] space-y-2">
            {b.summary && <Lead summary={b.summary} />}

            <ProsAndCons broker={b} />

            <CostSection broker={b} brokers={brokers} />

            <PlatformSection broker={b} />

            {b.offer_headline && <OfferSection broker={b} />}

            {faqs.length > 0 && (
              <section className="scroll-mt-24 py-10" id="faq">
                <SectionHeading eyebrow="The details">
                  Questions about {b.name}
                </SectionHeading>
                <div className={`mt-6 divide-y ${R.rule} border-y ${R.rule}`}>
                  {faqs.map((item) => (
                    <details key={item.question} className="group">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[15px] font-semibold leading-snug text-foreground [&::-webkit-details-marker]:hidden">
                        {item.question}
                        <ChevronDownIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#5a4128]/55 transition-transform group-open:rotate-180 dark:text-[#d8c4af]/60" />
                      </summary>
                      <p className={`max-w-2xl pb-5 ${R.body}`}>
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

            {related.length > 0 && (
              <nav className={`border-t ${R.rule} py-8`}>
                <p className={R.eyebrow}>More broker reviews</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <a
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#5a4128]/[0.05] dark:hover:bg-white/[0.04]`}
                        href={`/brokers/${item.slug}`}
                      >
                        <BrokerLogo broker={item} size={32} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground/80 group-hover:text-foreground">
                          {item.name}
                        </span>
                        <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-foreground/35 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/60" />
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <div className={`space-y-4 border-t ${R.rule} pt-8`}>
              <SourceNote broker={b} />
              <BrokerComplianceNote />
            </div>
          </article>

          <StickyBuyPanel broker={b} showIdentity={pastHeader} />
        </div>
      </div>

      <MobileVisitBar broker={b} />
    </DefaultLayout>
  );
}

/** The active broker's conversion panel, sat beside the article and sticky as
 *  the reader scrolls. Carries the facts the header band doesn't (accounts,
 *  protection, regulator) so the two don't repeat each other. The logo + name
 *  row only slides in once the page header has scrolled away — while the
 *  header is on screen it would be a straight duplicate. */
function StickyBuyPanel({
  broker: b,
  showIdentity,
}: {
  broker: BrokerOffer;
  showIdentity: boolean;
}) {
  return (
    <aside className="hidden lg:block lg:sticky lg:top-24">
      <div className="rounded-2xl border border-[#5a4128]/25 bg-background/60 p-4 dark:border-[#d8c4af]/25">
        <div
          aria-hidden={!showIdentity}
          className={`grid transition-all duration-300 ease-out ${
            showIdentity
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex items-center gap-3 pb-3">
              <BrokerLogo broker={b} size={44} />
              <div className="min-w-0">
                <p className="truncate font-bold text-foreground">{b.name}</p>
                {b.trust.trustpilot_rating != null && (
                  <StarRating value={b.trust.trustpilot_rating} />
                )}
              </div>
            </div>
          </div>
        </div>
        {b.offer_headline && (
          <OfferBadge className="mt-0" text={b.offer_headline} />
        )}
        <BrokerVisitLink
          broker={b}
          className="mt-4 w-full"
          placement="verdict"
          size="lg"
        />
        <p className="mt-2 text-center text-[10px] leading-4 text-foreground/45">
          Capital at risk. We may earn a commission.
        </p>
        <dl className="mt-4 border-t border-separator pt-1 text-[13px]">
          <PanelFact label="ISA" value={b.accounts.stocks_isa ? "Yes" : "No"} />
          <PanelFact label="SIPP" value={b.accounts.sipp ? "Yes" : "No"} />
          <PanelFact
            label="FSCS"
            value={b.trust.fscs_protected ? "Up to £85k" : "Not listed"}
          />
          {b.trust.regulator && (
            <PanelFact label="Regulated by" value={b.trust.regulator} />
          )}
        </dl>
      </div>
    </aside>
  );
}

function PanelFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-separator/70 py-2 last:border-b-0">
      <dt className="text-foreground/50">{label}</dt>
      <dd className="text-right font-semibold text-foreground/85">{value}</dd>
    </div>
  );
}

function ReviewHeader({
  broker: b,
  facts,
}: {
  broker: BrokerOffer;
  facts: Fact[];
}) {
  return (
    <header>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <nav
          aria-label="Breadcrumb"
          className="min-w-0 truncate text-foreground/50"
        >
          <a
            className="transition-colors hover:text-foreground"
            href="/brokers"
          >
            Broker reviews
          </a>
          <span className="mx-2 text-foreground/25">/</span>
          <span className="text-foreground/75">{b.name}</span>
        </nav>
        <p className="shrink-0 text-xs text-foreground/45">
          Updated {fmtVerifiedDate(b.last_verified)}
        </p>
      </div>

      <div className="mt-8 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <span
            aria-hidden="true"
            className={`block h-1.5 w-12 rounded-full ${R.brandFill}`}
            style={b.brand_color ? { background: b.brand_color } : undefined}
          />
          <h1 className="mt-5 text-[40px] font-bold leading-[0.96] tracking-[-0.035em] text-foreground sm:text-[52px]">
            {b.name}
          </h1>
          <p className="mt-4 max-w-xl text-lg font-medium leading-snug text-foreground/70 sm:text-xl">
            {b.tagline}
          </p>
          <RatingsLine broker={b} />
        </div>
        <BrokerLogo broker={b} className="mt-2 rounded-2xl" size={72} />
      </div>

      <dl
        className={`mt-9 grid grid-cols-2 overflow-hidden rounded-2xl border ${R.rule} sm:grid-cols-4`}
      >
        {facts.map((fact, index) => (
          <div
            key={fact.label}
            className={`bg-background/50 px-4 py-4 sm:px-5 ${
              index % 2 === 1 ? `border-l ${R.rule}` : ""
            } ${index > 1 ? `border-t ${R.rule} sm:border-t-0` : ""} sm:border-l sm:first:border-l-0`}
          >
            <dt className={R.eyebrow}>{fact.label}</dt>
            <dd className="mt-1.5 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

function Lead({ summary }: { summary: string }) {
  return (
    <section className="py-8">
      <p className={R.eyebrow}>The brief</p>
      <p
        className={`mt-3 max-w-2xl border-l-[3px] border-[#5a4128] pl-5 text-[17px] font-medium leading-8 text-foreground/85 dark:border-[#d8c4af]`}
      >
        {summary}
      </p>
    </section>
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
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
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
    <section className="py-4" id="verdict">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-emerald-600/[0.06] px-5 py-5 dark:bg-emerald-400/[0.08]">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-300">
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600/15 dark:bg-emerald-300/15"
            >
              <CheckIcon className="h-3 w-3" />
            </span>
            For
          </h2>
          <ul className="mt-4 space-y-3.5">
            {b.pros.map((item) => (
              <li
                key={item}
                className="flex gap-3 text-[14px] font-medium leading-6 text-foreground/85"
              >
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-[#a74f34]/[0.07] px-5 py-5 dark:bg-[#e6997d]/[0.10]">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8f422c] dark:text-[#e6997d]">
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#a74f34]/15 dark:bg-[#e6997d]/15"
            >
              <XMarkIcon className="h-3 w-3" />
            </span>
            Against
          </h2>
          <ul className="mt-4 space-y-3.5">
            {b.cons.map((item) => (
              <li
                key={item}
                className="flex gap-3 text-[14px] font-medium leading-6 text-foreground/85"
              >
                <XMarkIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#a74f34] dark:text-[#e6997d]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
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
      <p className={R.eyebrow}>{eyebrow}</p>
      <h2 className={`mt-2 ${R.title}`}>{children}</h2>
    </div>
  );
}

function OfferSection({ broker: b }: { broker: BrokerOffer }) {
  return (
    <section className="scroll-mt-24 py-8" id="offer">
      <div
        className={`${R.wash} border-l-[3px] border-[#5a4128] px-5 py-6 dark:border-[#d8c4af] sm:px-7`}
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${R.brandSoft} ${R.brandText}`}
          >
            <GiftIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className={R.eyebrow}>Current offer</p>
            <h2 className="mt-2 max-w-xl text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
              {b.offer_headline}
            </h2>
            {b.offer_terms && (
              <details className="group mt-3">
                <summary
                  className={`flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium ${R.brandText} hover:opacity-80 [&::-webkit-details-marker]:hidden`}
                >
                  <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
                  Read the terms
                </summary>
                <p className={`mt-2.5 max-w-2xl ${R.body}`}>{b.offer_terms}</p>
              </details>
            )}
          </div>
        </div>
      </div>
    </section>
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
    {
      label: `Cheapest · ${cheapest.name}`,
      total: cheapest.total,
      primary: false,
    },
  ];
  const max = Math.max(...rows.map((row) => row.total), 1);
  const parts = [
    { label: "Platform", value: mine.platform },
    { label: "Dealing", value: mine.dealing },
    { label: "FX", value: mine.fx },
  ];

  return (
    <section className="scroll-mt-24 py-10" id="costs">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow="Fees">What it costs</SectionHeading>
        <div className="inline-flex rounded-lg bg-[#5a4128]/[0.07] p-0.5 dark:bg-white/[0.08]">
          {COST_POTS.map((value) => (
            <button
              key={value}
              className={
                pot === value
                  ? `rounded-md ${BUTTON_SELECTED} px-3 py-1.5 text-xs font-semibold`
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

      <div className={`mt-6 ${R.wash} px-5 py-6 sm:px-7`}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-5xl font-bold tracking-tighter text-foreground sm:text-6xl">
            {fmtMoneyRound(mine.total)}
          </span>
          <span className="text-sm text-foreground/55">
            estimated each year on £{pot.toLocaleString("en-GB")}
          </span>
        </div>

        <dl className={`mt-5 grid grid-cols-3 gap-3 border-t ${R.rule} pt-5`}>
          {parts.map((part) => (
            <div key={part.label}>
              <dt className={R.eyebrow}>{part.label}</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums tracking-tight text-foreground">
                {fmtMoneyRound(part.value)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-7 space-y-4">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-1.5 flex justify-between gap-4 text-[13px]">
                <span
                  className={
                    row.primary
                      ? "font-bold text-foreground"
                      : "text-foreground/55"
                  }
                >
                  {row.label}
                </span>
                <span
                  className={
                    row.primary
                      ? "font-bold tabular-nums text-foreground"
                      : "font-semibold tabular-nums text-foreground/70"
                  }
                >
                  {fmtMoneyRound(row.total)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#5a4128]/[0.08] dark:bg-white/[0.08]">
                <div
                  className={
                    row.primary
                      ? `h-full rounded-full ${R.brandFill}`
                      : "h-full rounded-full bg-foreground/20"
                  }
                  style={{
                    width: `${Math.max((row.total / max) * 100, 1.5)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <details className={`group mt-6 border-t ${R.rule} pt-4`}>
          <summary
            className={`flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium ${R.brandText} hover:opacity-80 [&::-webkit-details-marker]:hidden`}
          >
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
    <div className="mt-3">
      <dl className={`divide-y ${R.rule} text-sm`}>
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6 py-2.5">
            <dt className="text-foreground/55">{label}</dt>
            <dd className="text-right font-semibold tabular-nums text-foreground/85">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[12px] leading-5 text-foreground/45">
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
    <section className="scroll-mt-24 py-10" id="platform">
      <SectionHeading eyebrow="At a glance">The platform</SectionHeading>

      <div className="mt-6 space-y-4">
        {groups.map((group) => {
          const items = group.items.filter(([, value]) => value != null);

          return (
            <div key={group.label} className={`${R.wash} px-5 py-4 sm:px-6`}>
              <h3 className={R.eyebrow}>{group.label}</h3>
              <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">
                {items.map(([label, value]) => (
                  <li
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-[#5a4128]/10 py-2.5 text-[14px] dark:border-[#d8c4af]/12"
                  >
                    <span
                      className={
                        value
                          ? "font-medium text-foreground/85"
                          : "text-foreground/40"
                      }
                    >
                      {label}
                    </span>
                    {value ? (
                      <CheckIcon
                        aria-label="Yes"
                        className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300"
                      />
                    ) : (
                      <span
                        aria-label="No"
                        className="text-[12px] font-semibold uppercase tracking-[0.08em] text-foreground/30"
                      >
                        No
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <div className={`flex items-start gap-3.5 ${R.wash} px-5 py-5 sm:px-6`}>
          <span
            aria-hidden="true"
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${R.brandSoft} ${R.brandText}`}
          >
            <ShieldCheckIcon className="h-5 w-5" />
          </span>
          <div>
            <p className={R.eyebrow}>Protection</p>
            <p className="mt-1.5 text-[15px] font-medium leading-6 text-foreground/80">
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

  const sources = [
    ...new Map(b.sources.map((source) => [sourceLabel(source), source])),
  ];

  return (
    <p className="text-xs leading-5 text-foreground/50">
      <span className={`${R.eyebrow} mr-1.5 inline`}>Sources</span>
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
