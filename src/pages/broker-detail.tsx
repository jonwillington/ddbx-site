import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
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
import appShots from "@/data/broker-app-screenshots.json";
import { api, type BrokerOffer } from "@/lib/api";
import {
  COST_POTS,
  estAnnualCost,
  fmtMoney,
  fmtMoneyRound,
  fmtPct,
  fmtVerifiedDate,
  isOfferLive,
  platformFeeSummary,
  sourceLabel,
} from "@/lib/brokers";

type Fact = { label: string; value: React.ReactNode };

/**
 * Review design language — flat, editorial, quiet.
 *
 *  Layout   → every section is heading-left / content-right on one grid
 *             (the Stripe/Cursor two-column pattern), separated by a single
 *             hairline and generous vertical air. No stacked eyebrow+title
 *             clusters.
 *  Surfaces → the review itself sits on `sheet`: one white document against
 *             the cream page, so content and chrome separate at a glance.
 *             Inside it the only raised surface is `tile`: a borderless
 *             low-alpha fill for data blocks (facts, offer). Nothing else
 *             gets a box.
 *  Rules    → one hairline colour, the same one the rail uses.
 *  Type     → sentence case everywhere; no uppercase, no letterspacing.
 *             Hierarchy comes from size and ink, not decoration.
 *  Colour   → reserved for meaning: emerald/rust ticks in the verdict, the
 *             CTA button. No per-broker brand graphics in the article.
 *
 * Chrome (rail, sticky buy panel, mobile bar) is untouched by this system.
 */
const R = {
  // A half-step off the cream page — present but low-contrast. White is
  // reserved for the floating buy panel so it reads as the raised object.
  sheet:
    "rounded-2xl border border-[#e8e0d5] bg-[#faf7f2] shadow-[0_1px_2px_rgba(90,65,40,0.03)] dark:border-white/[0.07] dark:bg-surface",
  rule: "border-[#e8e0d5] dark:border-separator",
  tile: "rounded-xl bg-black/[0.035] dark:bg-white/[0.05]",
  label: "text-[11px] leading-none text-foreground/50",
  body: "text-[14px] leading-[1.65] text-foreground/70",
  subhead: "text-[12px] font-semibold text-foreground/55",
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

      <div className="w-full pb-24 lg:pb-14">
        {/* Breadcrumb lives on the cream page, outside the document sheet. */}
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

        <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
          {/* The review document: header + article on one white sheet. */}
          <div className={`min-w-0 px-5 py-6 sm:px-8 sm:py-8 ${R.sheet}`}>
            <div ref={headerRef}>
              <ReviewHeader broker={b} facts={heroFacts} />
            </div>

            <article className="min-w-0">
              {b.summary && (
                <p className="max-w-[44em] py-7 text-[16.5px] font-normal leading-[1.6] tracking-[-0.006em] text-foreground/85">
                  {b.summary}
                </p>
              )}

              <Section id="verdict" title="Verdict">
                <div className="grid gap-10 sm:grid-cols-2">
                  <VerdictColumn items={b.pros} title="What works" tone="for" />
                  <VerdictColumn
                    items={b.cons}
                    title="What holds it back"
                    tone="against"
                  />
                </div>
              </Section>

              <AppShotsSection broker={b} />

              <CostSection broker={b} brokers={brokers} />

              <PlatformSection broker={b} />

              {isOfferLive(b) && <OfferSection broker={b} />}

              {faqs.length > 0 && (
                <Section id="faq" title="Questions & answers">
                  <div
                    className={`divide-y divide-[#e8e0d5] border-t ${R.rule} dark:divide-separator`}
                  >
                    {faqs.map((item) => (
                      <details key={item.question} className="group">
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-3 text-[14px] font-medium leading-snug text-foreground transition-colors hover:text-foreground/70 [&::-webkit-details-marker]:hidden">
                          {item.question}
                          <ChevronDownIcon className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40 transition-transform group-open:rotate-180" />
                        </summary>
                        <p className={`max-w-[42em] pb-4 ${R.body}`}>
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
                </Section>
              )}

              {related.length > 0 && (
                <Section title="More reviews">
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {related.map((item) => (
                      <li key={item.slug}>
                        <a
                          className="group -mx-3 flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                          href={`/brokers/${item.slug}`}
                        >
                          <BrokerLogo broker={item} size={28} />
                          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-foreground/75 group-hover:text-foreground">
                            {item.name}
                          </span>
                          <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/60" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <div className={`space-y-4 border-t ${R.rule} pt-8`}>
                <SourceNote broker={b} />
                <BrokerComplianceNote />
              </div>
            </article>
          </div>

          <StickyBuyPanel broker={b} showIdentity={pastHeader} />
        </div>
      </div>

      <MobileVisitBar broker={b} />
    </DefaultLayout>
  );
}

/** The two-column editorial section: heading in the left column, content in
 *  the right, one hairline above. Every article block shares this shape so
 *  the page reads as one continuous ruled document. */
function Section({
  id,
  title,
  aside,
  children,
}: {
  id?: string;
  title: string;
  /** Optional control rendered under the heading (e.g. the pot toggle). */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`grid scroll-mt-24 gap-x-10 gap-y-4 border-t ${R.rule} py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:py-9`}
      id={id}
    >
      <div>
        <h2 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground">
          {title}
        </h2>
        {aside && <div className="mt-3">{aside}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
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
      <div className="rounded-2xl border border-[#5a4128]/20 bg-white p-4 shadow-[0_8px_24px_rgba(90,65,40,0.08)] dark:border-[#d8c4af]/25 dark:bg-surface-secondary">
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
        {isOfferLive(b) && (
          <OfferBadge className="mt-0" text={b.offer_headline!} />
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
      <div className="flex items-start gap-4">
        <BrokerLogo broker={b} className="mt-0.5 rounded-xl" size={48} />
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-[1.05] tracking-[-0.022em] text-foreground sm:text-[34px]">
            {b.name}
          </h1>
          <p className="mt-1.5 max-w-xl text-[15px] leading-snug text-foreground/65 sm:text-[16px]">
            {b.tagline}
          </p>
          <RatingsLine broker={b} />
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className={`${R.tile} px-3.5 py-3`}>
            <dt className={R.label}>{fact.label}</dt>
            <dd className="mt-1.5 truncate text-[15.5px] font-semibold leading-none tracking-[-0.01em] text-foreground">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
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
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
      <StarRating value={average} />
      <span className="text-xs text-foreground/50">
        {ratings
          .map((item) => `${item.label} ${item.value.toFixed(1)}`)
          .join(" · ")}
      </span>
    </div>
  );
}

function VerdictColumn({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "for" | "against";
}) {
  const Icon = tone === "for" ? CheckIcon : XMarkIcon;
  const iconInk =
    tone === "for"
      ? "text-emerald-700/70 dark:text-emerald-300/70"
      : "text-[#a74f34]/70 dark:text-[#e6997d]/70";

  return (
    <div>
      <h3 className={R.subhead}>{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2.5 text-[13.5px] leading-[1.55] text-foreground/80"
          >
            <Icon
              className={`mt-[4px] h-3.5 w-3.5 shrink-0 ${iconInk}`}
              strokeWidth={2.5}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type AppShotsEntry = {
  appId: number;
  appName: string;
  appUrl: string;
  /** mzstatic base URLs — append a size rendition like /600x1300bb.webp. */
  screenshots: string[];
};

/** The broker's own App Store screenshots, hotlinked from Apple's CDN at
 *  render sizes. Data is baked in by scripts/fetch-app-screenshots.mjs;
 *  brokers without a resolved app simply skip the section. */
function AppShotsSection({ broker: b }: { broker: BrokerOffer }) {
  const entry = (appShots as Record<string, AppShotsEntry>)[b.slug];

  if (!entry?.screenshots.length) return null;

  return (
    <Section id="app" title="Inside the app">
      <div className="flex snap-x gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
        {entry.screenshots.map((base, index) => (
          <img
            key={base}
            alt={`${b.name} app screenshot ${index + 1}`}
            className={`h-[270px] w-auto shrink-0 snap-start rounded-xl border ${R.rule}`}
            decoding="async"
            loading="lazy"
            src={`${base}/300x650bb.webp`}
            srcSet={`${base}/300x650bb.webp 1x, ${base}/600x1300bb.webp 2x`}
          />
        ))}
      </div>
      <a
        className="mt-3 inline-block text-[13px] font-medium text-foreground/55 underline underline-offset-2 transition-colors hover:text-foreground"
        href={entry.appUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        View {entry.appName} on the App Store
      </a>
    </Section>
  );
}

function OfferSection({ broker: b }: { broker: BrokerOffer }) {
  return (
    <Section id="offer" title="Current offer">
      <div className={`${R.tile} px-5 py-4`}>
        <p className="max-w-xl text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
          {b.offer_headline}
        </p>
        {b.offer_terms && (
          <details className="group mt-3">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-foreground/55 transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
              Read the terms
            </summary>
            <p className={`mt-2.5 max-w-2xl ${R.body}`}>{b.offer_terms}</p>
          </details>
        )}
      </div>
    </Section>
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

  const potToggle = (
    <div className="inline-flex rounded-lg bg-black/[0.05] p-0.5 dark:bg-white/[0.08]">
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
  );

  return (
    <Section aside={potToggle} id="costs" title="What it costs">
      {/* Hero figure + the composition beside it. Proportional figures on
          the big number (tabular looks loose at display sizes); tabular is
          reserved for the aligned columns below. */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <span className="block text-[38px] font-bold leading-none tracking-[-0.028em] text-foreground sm:text-[44px]">
            {fmtMoneyRound(mine.total)}
          </span>
          <span className="mt-1.5 block text-[12.5px] text-foreground/55">
            estimated each year on £{pot.toLocaleString("en-GB")}
          </span>
        </div>
        <dl className="flex gap-6 sm:gap-7">
          {parts.map((part) => (
            <div key={part.label} className={`border-l ${R.rule} pl-3.5`}>
              <dt className={R.label}>{part.label}</dt>
              <dd className="mt-1.5 text-[15px] font-semibold leading-none tracking-tight text-foreground/90">
                {fmtMoneyRound(part.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Comparison: label · bar · value rows off one shared baseline. Only
          this broker's bar carries full ink — identity is in the row labels,
          never colour alone. */}
      <div
        className={`mt-6 grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-x-4 gap-y-3 border-t ${R.rule} pt-5 sm:grid-cols-[minmax(0,11rem)_1fr_auto]`}
      >
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <span
              className={`truncate text-[13px] leading-none ${
                row.primary
                  ? "font-semibold text-foreground"
                  : "text-foreground/55"
              }`}
            >
              {row.label}
            </span>
            <span className={`h-[12px] self-center border-l ${R.rule}`}>
              <span
                className={`block h-full rounded-r-[4px] ${
                  row.primary
                    ? "bg-foreground/80"
                    : "bg-foreground/20 dark:bg-white/20"
                }`}
                style={{
                  width: `${Math.max((row.total / max) * 100, 1.5)}%`,
                }}
              />
            </span>
            <span
              className={`text-right text-[13px] leading-none tabular-nums ${
                row.primary
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground/60"
              }`}
            >
              {fmtMoneyRound(row.total)}
            </span>
          </div>
        ))}
      </div>

      <details className={`group mt-6 border-t ${R.rule} pt-4`}>
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-foreground/60 transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
          Full fee schedule and methodology
        </summary>
        <FeeSchedule broker={b} />
      </details>
    </Section>
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
      <dl className="divide-y divide-[#e8e0d5] text-[13px] dark:divide-separator">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6 py-2">
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
    <Section id="platform" title="The platform">
      <div className="space-y-6">
        {groups.map((group) => {
          const items = group.items.filter(([, value]) => value != null);

          return (
            <div key={group.label}>
              <h3 className={R.subhead}>{group.label}</h3>
              <ul className="mt-1.5 grid gap-x-10 sm:grid-cols-2">
                {items.map(([label, value]) => (
                  <li
                    key={label}
                    className={`flex items-center justify-between gap-4 border-b ${R.rule} py-[7px] text-[13.5px]`}
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
                        className="h-[15px] w-[15px] shrink-0 text-emerald-700 dark:text-emerald-300"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <span
                        aria-label="No"
                        className="text-[14px] leading-none text-foreground/30"
                      >
                        —
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-foreground/45" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold leading-snug text-foreground">
              {b.trust.fscs_protected
                ? "FSCS protected up to £85,000"
                : "Not listed as FSCS protected"}
            </p>
            <p className="mt-0.5 text-[12.5px] text-foreground/55">
              {[
                b.trust.regulator && `Regulated by the ${b.trust.regulator}`,
                b.trust.year_founded && `founded ${b.trust.year_founded}`,
                b.trust.headquarters,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function SourceNote({ broker: b }: { broker: BrokerOffer }) {
  if (!b.sources?.length) return null;

  const sources = [
    ...new Map(b.sources.map((source) => [sourceLabel(source), source])),
  ];

  return (
    <p className="text-xs leading-5 text-foreground/50">
      <span className="mr-1 font-semibold text-foreground/55">Sources</span>
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
