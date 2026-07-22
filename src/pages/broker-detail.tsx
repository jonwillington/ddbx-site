// Per-platform detail / review page: /brokers/:slug. Fetches the full (cached)
// /api/brokers list so it can find the row, compute field-relative fee context,
// and cross-sell the top picks. Public, ungated — does not import discretion.
//
// Layout philosophy: six blocks, each earning its height, fees stated once.
//   1. Hero — identity + the five headline facts as an open stat strip.
//   2. Overview — open prose; pros/cons as open two-column lists.
//   3. What it costs — THE fee section: annual-cost model, rank-of-N chip,
//      comparison bars, and the full schedule + verdict chips collapsed below.
//   4. The platform — accounts/assets/features as labelled chip rows + trust
//      facts. One block, not three panels.
//   5. Offer — a slim strip, not a titled section.
//   6. FAQ / sources / cross-sell tail.
// Section headings sit outside panels (editorial); the only panel is the cost
// visual. Everything else is open with hairline rules for density.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  MapPinIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import { BrokerBuyBoxAside } from "@/components/brokers/broker-aside";
import {
  BadgeChip,
  BrokerComplianceNote,
  BrokerDisclosure,
  BrokerLogo,
  BrokerVisitLink,
  OfferBadge,
  StarRating,
} from "@/components/brokers/broker-ui";
import { BUTTON_SELECTED } from "@/components/button";
import { CHIP_BASE, CHIP_HAIRLINE, CHIP_SIZE } from "@/components/chip";
import DefaultLayout from "@/layouts/default";
import { subtitle, title } from "@/components/primitives";
import { api, type BrokerOffer } from "@/lib/api";
import {
  COST_POTS,
  type CompareTone,
  brandTint,
  compareToField,
  estAnnualCost,
  fmtMoney,
  fmtMoneyRound,
  fmtPct,
  fmtVerifiedDate,
  platformFeeSummary,
  sourceLabel,
} from "@/lib/brokers";

type Row = { label: string; node: React.ReactNode };

function fieldStats(
  brokers: BrokerOffer[],
  sel: (b: BrokerOffer) => number | null | undefined,
): { avg: number | null; min: number | null } {
  const values = brokers.map(sel).filter((v): v is number => v != null);

  if (!values.length) return { avg: null, min: null };

  return {
    avg: values.reduce((a, c) => a + c, 0) / values.length,
    min: Math.min(...values),
  };
}

const TONE_CHIP: Record<CompareTone, string> = {
  good: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  bad: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  neutral: "bg-black/[0.06] text-foreground/60 dark:bg-white/10",
};

/** The site's editorial accent as data ink — validated ≥3:1 against both
 *  surfaces. Brand colour stays decorative (hero wash only). */
const DATA_INK = "bg-[#5a4128] dark:bg-[#d8c4af]";

/** Section heading outside any panel — the page's typographic anchor. */
function SectionHead({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {children}
      </h2>
      {aside}
    </div>
  );
}

export default function BrokerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [brokers, setBrokers] = useState<BrokerOffer[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "missing" | "error">(
    "loading",
  );
  const [err, setErr] = useState<string | null>(null);
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    api
      .brokers("UK")
      .then((list) => setBrokers(list))
      .catch((e) => {
        setErr((e as Error).message);
        setStatus("error");
      });
  }, []);

  const b = useMemo(
    () => (brokers ? (brokers.find((x) => x.slug === slug) ?? null) : null),
    [brokers, slug],
  );

  useEffect(() => {
    if (!brokers) return;
    setStatus(b ? "ok" : "missing");
  }, [brokers, b]);

  // Field-relative verdicts ("Lowest", "Above average") shown as chips on the
  // full fee schedule rows.
  const verdicts = useMemo(() => {
    if (!b) return {};
    const list = brokers ?? [];
    const of = (
      value: number | null,
      sel: (x: BrokerOffer) => number | null | undefined,
    ) => {
      const s = fieldStats(list, sel);

      return compareToField(value, s.avg, s.min);
    };

    return {
      platform: of(
        b.fees.platform_fee_monthly_gbp,
        (x) => x.fees.platform_fee_monthly_gbp,
      ),
      uk: of(
        b.fees.trade_commission_uk_gbp,
        (x) => x.fees.trade_commission_uk_gbp,
      ),
      fx: of(b.fees.fx_fee_pct, (x) => x.fees.fx_fee_pct),
      minDep: of(b.fees.min_deposit_gbp, (x) => x.fees.min_deposit_gbp),
    } as Record<string, { label: string; tone: CompareTone } | null>;
  }, [b, brokers]);

  const crossSell = useMemo(
    () => (brokers ?? []).filter((x) => x.recommended && x.slug !== slug),
    [brokers, slug],
  );

  const moreBrokers = useMemo(
    () => (brokers ?? []).filter((x) => x.slug !== slug).slice(0, 8),
    [brokers, slug],
  );

  const navItems = useMemo(() => {
    if (!b) return [];

    return [
      { id: "overview", label: "Overview" },
      { id: "costs", label: "What it costs" },
      { id: "platform", label: "The platform" },
      ...(b.offer_headline ? [{ id: "offer", label: "Offer" }] : []),
      { id: "faq", label: "FAQ" },
      ...(b.sources?.length ? [{ id: "sources", label: "Sources" }] : []),
    ];
  }, [b]);

  // Scroll-spy: highlight the nav pill for the section currently in view.
  useEffect(() => {
    if (status !== "ok" || !navItems.length) return;
    const els = navItems
      .map((n) => document.getElementById(n.id))
      .filter((el): el is HTMLElement => el != null);

    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (x, y) => x.boundingClientRect.top - y.boundingClientRect.top,
          )[0];

        if (top) setActiveId(top.target.id);
      },
      { rootMargin: "-120px 0px -70% 0px", threshold: 0 },
    );

    els.forEach((el) => obs.observe(el));

    return () => obs.disconnect();
  }, [status, navItems]);

  if (status === "loading") {
    return (
      <DefaultLayout>
        <div className="mx-auto max-w-[900px] animate-pulse space-y-4">
          <div className="h-56 rounded-3xl bg-surface" />
          <div className="h-5 w-2/3 rounded bg-surface" />
          <div className="h-40 rounded-2xl bg-surface" />
          <div className="h-40 rounded-2xl bg-surface" />
        </div>
      </DefaultLayout>
    );
  }

  if (status === "error") {
    return (
      <DefaultLayout>
        <p className="mx-auto max-w-[900px] text-sm text-foreground/60">
          Couldn’t load this platform ({err}).{" "}
          <a className="underline" href="/brokers">
            Back to the comparison
          </a>
          .
        </p>
      </DefaultLayout>
    );
  }

  if (status === "missing" || !b) {
    return (
      <DefaultLayout>
        <p className="mx-auto max-w-[900px] text-sm text-foreground/60">
          We don’t have a profile for that platform.{" "}
          <a className="underline" href="/brokers">
            See all platforms
          </a>
          .
        </p>
      </DefaultLayout>
    );
  }

  const money = (v: number | null) => (v == null ? null : fmtMoney(v));

  // Full fee schedule (collapsed by default) — null rows are dropped, and the
  // four benchmarked fields carry their field-relative verdict chips.
  const feeRows: (Row & {
    cmp?: { label: string; tone: CompareTone } | null;
  })[] = (
    [
      { label: "Charging model", node: b.fees.fee_model },
      {
        label: "Platform fee",
        node: platformFeeSummary(b.fees),
        cmp: verdicts.platform,
      },
      { label: "Platform fee note", node: b.fees.platform_fee_note },
      {
        label: "UK share trade",
        node: money(b.fees.trade_commission_uk_gbp),
        cmp: verdicts.uk,
      },
      { label: "US share trade", node: money(b.fees.trade_commission_us_gbp) },
      { label: "Fund dealing", node: money(b.fees.fund_dealing_gbp) },
      {
        label: "FX fee",
        node: b.fees.fx_fee_pct == null ? null : fmtPct(b.fees.fx_fee_pct),
        cmp: verdicts.fx,
      },
      { label: "Withdrawal fee", node: money(b.fees.withdrawal_fee_gbp) },
      {
        label: "Minimum deposit",
        node: money(b.fees.min_deposit_gbp),
        cmp: verdicts.minDep,
      },
      { label: "Inactivity fee", node: b.fees.inactivity_fee_note },
    ] as {
      label: string;
      node: React.ReactNode | null;
      cmp?: { label: string; tone: CompareTone } | null;
    }[]
  ).filter((r): r is Row => r.node != null);

  const heroStats: Row[] = [
    { label: "Platform fee", node: platformFeeSummary(b.fees) },
    ...(b.fees.trade_commission_uk_gbp != null
      ? [{ label: "UK trade", node: fmtMoney(b.fees.trade_commission_uk_gbp) }]
      : []),
    ...(b.fees.fx_fee_pct != null
      ? [{ label: "FX fee", node: fmtPct(b.fees.fx_fee_pct) }]
      : []),
    {
      label: "Accounts",
      node:
        [b.accounts.stocks_isa && "ISA", b.accounts.sipp && "SIPP"]
          .filter(Boolean)
          .join(" + ") || "General only",
    },
    {
      label: "FSCS",
      node: b.trust.fscs_protected ? "Protected" : "Not listed",
    },
  ];

  const platformNotes = [
    b.accounts.isa_note,
    b.accounts.sipp_note,
    b.trust.interest_on_cash_note,
  ].filter((n): n is string => n != null);

  const faqs = (
    [
      b.accounts.stocks_isa != null && {
        q: `Does ${b.name} offer a Stocks & Shares ISA?`,
        a: b.accounts.stocks_isa
          ? `Yes — ${b.name} offers a Stocks & Shares ISA.${b.accounts.isa_note ? ` ${b.accounts.isa_note}` : ""}`
          : `No, ${b.name} does not currently offer a Stocks & Shares ISA.`,
      },
      b.accounts.sipp != null && {
        q: `Does ${b.name} offer a SIPP?`,
        a: b.accounts.sipp
          ? `Yes — ${b.name} offers a SIPP (self-invested personal pension).${b.accounts.sipp_note ? ` ${b.accounts.sipp_note}` : ""}`
          : `No, ${b.name} does not offer a SIPP.`,
      },
      b.trust.fscs_protected != null && {
        q: `Is ${b.name} FSCS protected?`,
        a: b.trust.fscs_protected
          ? `Yes — eligible money and investments held with ${b.name} are protected by the FSCS up to £85,000 if the firm fails.`
          : `${b.name} is not listed as FSCS protected — check the provider for details.`,
      },
      {
        q: `How much does ${b.name} charge?`,
        a: `${b.name}’s platform fee is ${platformFeeSummary(b.fees)}. UK share trades cost ${fmtMoney(b.fees.trade_commission_uk_gbp)} and the FX fee on overseas trades is ${fmtPct(b.fees.fx_fee_pct)}.`,
      },
      b.assets.fractional_shares != null && {
        q: `Can I buy fractional shares with ${b.name}?`,
        a: b.assets.fractional_shares
          ? `Yes — ${b.name} lets you buy fractional shares, so you can invest smaller amounts.`
          : `No, ${b.name} does not offer fractional shares.`,
      },
      b.offer_headline && {
        q: `Does ${b.name} have a sign-up offer?`,
        a: `${b.offer_headline}.${b.offer_terms ? ` ${b.offer_terms}` : ""}`,
      },
    ] as ({ q: string; a: string } | false)[]
  ).filter(Boolean) as { q: string; a: string }[];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <DefaultLayout drawerRight hideMobileCta>
      <BrokerBuyBoxAside broker={b} />
      <div className="pb-24 lg:pb-0">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-foreground/50">
          <a
            className="underline-offset-2 hover:text-foreground hover:underline"
            href="/brokers"
          >
            Brokers
          </a>
          <span>/</span>
          <BrokerSwitcher brokers={brokers ?? []} current={b} />
        </nav>

        {/* Mobile section sub-nav (horizontal, scroll-spy) */}
        <nav className="sticky top-16 z-10 mt-4 mb-6 hidden overflow-x-auto rounded-xl border border-separator bg-background/85 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:block lg:hidden">
          <ul className="flex min-w-max items-center gap-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  className={
                    activeId === item.id
                      ? `inline-flex rounded-lg ${BUTTON_SELECTED} px-3 py-1.5 text-xs font-medium`
                      : "inline-flex rounded-lg px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-surface hover:text-foreground"
                  }
                  href={`#${item.id}`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 lg:flex lg:gap-10">
          {/* Left sticky section nav (desktop) */}
          <aside className="hidden w-48 shrink-0 lg:block">
            <nav className="sticky top-24">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                On this page
              </p>
              <ul className="space-y-0.5 border-l border-separator">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <a
                      className={
                        activeId === item.id
                          ? "-ml-px block border-l-2 border-[#5a4128] px-3 py-1.5 text-xs font-medium text-foreground dark:border-[#d8c4af]"
                          : "-ml-px block border-l-2 border-transparent px-3 py-1.5 text-xs text-foreground/55 transition-colors hover:text-foreground"
                      }
                      href={`#${item.id}`}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main content */}
          <article className="min-w-0 flex-1">
            {/* Hero — brand-tinted band with the headline facts as an open
                stat strip. Everything at-a-glance lives here. */}
            <header className="relative mb-5 overflow-hidden rounded-3xl border border-separator">
              <HeroWash color={b.brand_color} />
              <div className="relative p-6 sm:p-8">
                <div className="flex items-center gap-5">
                  <BrokerLogo broker={b} className="shadow-sm" size={80} />
                  <div className="min-w-0">
                    <h1 className={title({ size: "sm" })}>{b.name}</h1>
                    <RatingsLine broker={b} className="mt-1.5" />
                  </div>
                </div>

                <p
                  className={`${subtitle({ fullWidth: true })} mt-3 !text-[17px] !leading-snug !text-foreground/80`}
                >
                  {b.tagline}
                </p>

                {(b.badges.length > 0 || b.last_verified) && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {b.badges.map((bd) => (
                      <BadgeChip key={bd} badge={bd} />
                    ))}
                    <span
                      className={`${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.sm} text-foreground/50`}
                    >
                      Verified {fmtVerifiedDate(b.last_verified)}
                    </span>
                  </div>
                )}

                {/* Stat strip — open cells, hairline top rule, no boxes. */}
                <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4 border-t border-separator/70 pt-4">
                  {heroStats.map((row) => (
                    <div key={row.label}>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                        {row.label}
                      </dt>
                      <dd className="mt-0.5 text-lg font-semibold tracking-tight text-foreground/90">
                        {row.node}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Hero CTA (desktop relies on the rail buy-box; this covers
                    tablet and phones) */}
                <div className="mt-5 flex flex-wrap items-center gap-3 lg:hidden">
                  <BrokerVisitLink
                    broker={b}
                    placement="detail_header"
                    size="lg"
                  />
                  {b.offer_headline && <OfferBadge text={b.offer_headline} />}
                </div>
              </div>
            </header>

            <BrokerDisclosure className="mb-10" />

            {/* Overview — open prose, open two-column pros/cons. */}
            <section className="mb-12 scroll-mt-28" id="overview">
              {b.summary && (
                <p className="text-[16px] leading-relaxed text-foreground/85">
                  {b.summary}
                </p>
              )}
              {(b.pros?.length || b.cons?.length) > 0 && (
                <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                  {b.pros?.length > 0 && (
                    <div>
                      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-[#17935a] dark:text-[#5fd39a]">
                        Why we rate it
                      </h3>
                      <ul className="space-y-2 text-sm leading-snug text-foreground/80">
                        {b.pros.map((p) => (
                          <li key={p} className="flex gap-2">
                            <span
                              aria-hidden
                              className="mt-px font-semibold text-[#17935a] dark:text-[#5fd39a]"
                            >
                              +
                            </span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {b.cons?.length > 0 && (
                    <div className="border-t border-separator/60 pt-5 sm:border-l sm:border-t-0 sm:pl-10 sm:pt-0">
                      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-[#c2603f]">
                        What holds it back
                      </h3>
                      <ul className="space-y-2 text-sm leading-snug text-foreground/80">
                        {b.cons.map((c) => (
                          <li key={c} className="flex gap-2">
                            <span
                              aria-hidden
                              className="mt-px font-semibold text-[#c2603f]"
                            >
                              −
                            </span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* What it costs — the single fee section. */}
            <CostSection broker={b} brokers={brokers ?? []} feeRows={feeRows} />

            {/* The platform — accounts, assets, features, trust in one block. */}
            <section className="mb-12 scroll-mt-28" id="platform">
              <SectionHead>The platform</SectionHead>
              <div className="divide-y divide-separator/50 border-y border-separator/50">
                <PlatformRow
                  items={[
                    { label: "GIA", value: b.accounts.gia },
                    {
                      label: "Stocks & Shares ISA",
                      value: b.accounts.stocks_isa,
                    },
                    { label: "SIPP", value: b.accounts.sipp },
                    { label: "Lifetime ISA", value: b.accounts.lisa },
                    { label: "Junior ISA", value: b.accounts.jisa },
                  ]}
                  label="Accounts"
                />
                <PlatformRow
                  items={[
                    { label: "UK shares", value: b.assets.uk_shares },
                    { label: "US shares", value: b.assets.us_shares },
                    { label: "Global shares", value: b.assets.global_shares },
                    { label: "ETFs", value: b.assets.etfs },
                    { label: "Funds", value: b.assets.mutual_funds },
                    {
                      label: "Investment trusts",
                      value: b.assets.investment_trusts,
                    },
                    { label: "Fractional", value: b.assets.fractional_shares },
                    { label: "Bonds & gilts", value: b.assets.bonds_gilts },
                    { label: "Options", value: b.assets.options },
                    { label: "Crypto", value: b.assets.crypto },
                  ]}
                  label="Assets"
                />
                <PlatformRow
                  items={[
                    {
                      label: "Interest on cash",
                      value: b.trust.interest_on_cash,
                    },
                    { label: "Auto-invest", value: b.trust.auto_invest },
                    {
                      label: "Dividend reinvestment",
                      value: b.trust.dividend_reinvestment,
                    },
                    { label: "Web platform", value: b.trust.web_platform },
                    { label: "Mobile app", value: b.trust.mobile_app },
                  ]}
                  label="Features"
                />
                <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-baseline">
                  <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                    Trust
                  </span>
                  <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-foreground/80">
                    {b.trust.fscs_protected != null && (
                      <TrustFact
                        icon={<ShieldCheckIcon className="h-4 w-4" />}
                        label={
                          b.trust.fscs_protected
                            ? "FSCS protected (£85k)"
                            : "Not FSCS listed"
                        }
                      />
                    )}
                    {b.trust.regulator && (
                      <TrustFact
                        icon={<ScaleIcon className="h-4 w-4" />}
                        label={`${b.trust.regulator} regulated`}
                      />
                    )}
                    {b.trust.year_founded != null && (
                      <TrustFact
                        icon={<CalendarIcon className="h-4 w-4" />}
                        label={`Founded ${b.trust.year_founded}`}
                      />
                    )}
                    {b.trust.headquarters && (
                      <TrustFact
                        icon={<MapPinIcon className="h-4 w-4" />}
                        label={b.trust.headquarters}
                      />
                    )}
                  </ul>
                </div>
              </div>
              {platformNotes.length > 0 && (
                <div className="mt-3 space-y-1 text-[13px] leading-snug text-foreground/55">
                  {platformNotes.map((n) => (
                    <p key={n}>{n}</p>
                  ))}
                </div>
              )}
            </section>

            {/* Offer — slim strip, not a titled section. */}
            {b.offer_headline && (
              <section className="mb-12 scroll-mt-28" id="offer">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#5a4128]/[0.07] p-4 dark:bg-[#d8c4af]/[0.1]">
                  <OfferBadge
                    className="!bg-transparent !p-0"
                    text={b.offer_headline}
                  />
                  <BrokerVisitLink broker={b} placement="offer" />
                </div>
                {b.offer_terms && (
                  <details className="group mt-2">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-foreground/50 hover:text-foreground/70 [&::-webkit-details-marker]:hidden">
                      <ChevronDownIcon className="h-3 w-3 transition-transform group-open:rotate-180" />
                      Offer terms
                    </summary>
                    <p className="mt-1.5 text-xs leading-relaxed text-foreground/55">
                      {b.offer_terms}
                    </p>
                  </details>
                )}
              </section>
            )}

            {/* FAQ — open accordions; JSON-LD keeps the full text for search. */}
            {faqs.length > 0 && (
              <section className="mb-12 scroll-mt-28" id="faq">
                <SectionHead>{b.name} FAQ</SectionHead>
                <div className="divide-y divide-separator/50 border-y border-separator/50">
                  {faqs.map((f) => (
                    <details key={f.q} className="group py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground/85 [&::-webkit-details-marker]:hidden">
                        {f.q}
                        <ChevronDownIcon className="h-4 w-4 shrink-0 text-foreground/45 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                        {f.a}
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

            {/* Sources */}
            {b.sources?.length > 0 && (
              <div className="scroll-mt-28" id="sources">
                <p className="text-[13px] leading-relaxed text-foreground/55">
                  <span className="font-semibold uppercase tracking-wide text-foreground/45">
                    Sources:{" "}
                  </span>
                  {[...new Map(b.sources.map((s) => [sourceLabel(s), s]))].map(
                    ([label, s], i, arr) => (
                      <span key={label}>
                        <a
                          className="underline underline-offset-2 hover:text-foreground/80"
                          href={s}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {label}
                        </a>
                        {i < arr.length - 1 ? " · " : ""}
                      </span>
                    ),
                  )}{" "}
                  — figures last checked {fmtVerifiedDate(b.last_verified)}.
                  Always confirm current terms on {b.name}’s own site.
                </p>
              </div>
            )}

            {/* Cross-sell: top picks moved here from the rail */}
            {crossSell.length > 0 && (
              <div className="mt-10">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/50">
                  Our top picks
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {crossSell.map((p) => (
                    <div
                      key={p.slug}
                      className="flex flex-col rounded-2xl border border-[#5a4128]/25 bg-surface/60 p-4 dark:border-[#d8c4af]/25"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <BrokerLogo broker={p} size={44} />
                          <a
                            className="font-semibold text-foreground hover:underline"
                            href={`/brokers/${p.slug}`}
                          >
                            {p.name}
                          </a>
                        </div>
                        {p.badges.includes("top_pick") && (
                          <BadgeChip badge="top_pick" />
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-foreground/60">
                        {p.tagline}
                      </p>
                      <p className="mt-2 text-xs text-foreground/55">
                        Platform fee: {platformFeeSummary(p.fees)} · FX{" "}
                        {fmtPct(p.fees.fx_fee_pct)}
                      </p>
                      <div className="mt-4 flex items-center gap-3 pt-1">
                        <BrokerVisitLink broker={p} placement="cross_sell" />
                        <a
                          className="text-sm text-foreground/55 underline underline-offset-2 hover:text-foreground"
                          href={`/brokers/${p.slug}`}
                        >
                          Full review
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {moreBrokers.length > 0 && (
              <div className="mt-12">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground/50">
                  Check out more UK brokers
                </h2>
                <div className="flex flex-wrap gap-x-6 gap-y-5">
                  {moreBrokers.map((m) => (
                    <a
                      key={m.slug}
                      className="group flex w-[76px] flex-col items-center gap-2 text-center"
                      href={`/brokers/${m.slug}`}
                    >
                      <BrokerLogo
                        broker={m}
                        className="transition-transform group-hover:scale-105"
                        size={60}
                      />
                      <span className="line-clamp-2 text-[11px] leading-tight text-foreground/65 group-hover:text-foreground">
                        {m.name}
                      </span>
                    </a>
                  ))}
                  <a
                    className="group flex w-[76px] flex-col items-center gap-2 text-center"
                    href="/brokers"
                  >
                    <span className="inline-flex h-[60px] w-[60px] items-center justify-center rounded-lg border border-dashed border-separator text-lg text-foreground/50 transition-colors group-hover:border-[#5a4128]/50 group-hover:text-foreground">
                      →
                    </span>
                    <span className="text-[11px] leading-tight text-foreground/65 group-hover:text-foreground">
                      See all
                    </span>
                  </a>
                </div>
              </div>
            )}

            <BrokerComplianceNote className="mt-10 mb-12" />
          </article>
        </div>
      </div>

      {/* Mobile sticky Visit bar (replaces the app-download CTA on /brokers/*) */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-separator bg-background/95 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-[900px] items-center gap-3">
          <BrokerLogo broker={b} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">
              {b.name}
            </div>
            {b.offer_headline && (
              <div className="truncate text-[11px] text-[#5a4128] dark:text-[#d8c4af]">
                {b.offer_headline}
              </div>
            )}
          </div>
          <BrokerVisitLink broker={b} placement="mobile_bar" />
        </div>
      </div>
    </DefaultLayout>
  );
}

/** Decorative brand wash behind the hero. Two layers so light and dark modes
 *  each get an alpha tuned to their surface; neutral fallback when the broker
 *  has no brand_color. */
function HeroWash({ color }: { color: string | null | undefined }) {
  const light = brandTint(color, 0.14);
  const dark = brandTint(color, 0.2);

  if (!light || !dark) {
    return <div aria-hidden className="absolute inset-0 bg-surface/55" />;
  }

  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 dark:hidden"
        style={{
          background: `linear-gradient(135deg, ${light}, ${brandTint(color, 0.05)} 55%, transparent 85%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 hidden dark:block"
        style={{
          background: `linear-gradient(135deg, ${dark}, ${brandTint(color, 0.07)} 55%, transparent 85%)`,
        }}
      />
    </>
  );
}

/** One compact ratings line: leading stars on the mean score plus the
 *  per-store numbers as quiet text — replaces three separate star rows. */
function RatingsLine({
  broker,
  className,
}: {
  broker: BrokerOffer;
  className?: string;
}) {
  const items = (
    [
      { label: "App Store", value: broker.trust.app_store_rating },
      { label: "Google Play", value: broker.trust.play_store_rating },
      { label: "Trustpilot", value: broker.trust.trustpilot_rating },
    ] as { label: string; value: number | null }[]
  ).filter((i): i is { label: string; value: number } => i.value != null);

  if (!items.length) return null;

  const avg = items.reduce((a, c) => a + c.value, 0) / items.length;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className ?? ""}`}
    >
      <StarRating value={avg} />
      <span className="text-[11px] text-foreground/50">
        {items.map((i) => `${i.value.toFixed(1)} ${i.label}`).join(" · ")}
      </span>
    </div>
  );
}

/** One labelled chip row of the platform block: offered items as chips, the
 *  rest as a trailing muted note. Unknown (null) is omitted entirely. */
function PlatformRow({
  label,
  items,
}: {
  label: string;
  items: { label: string; value: boolean | null | undefined }[];
}) {
  const yes = items.filter((i) => i.value === true);
  const no = items.filter((i) => i.value === false);

  if (!yes.length && !no.length) return null;

  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-baseline">
      <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
        {label}
      </span>
      <div className="flex flex-wrap items-baseline gap-1.5">
        {yes.map((i) => (
          <span
            key={i.label}
            className={`${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.sm} bg-[#e8e0d5] text-foreground/75 dark:bg-surface-secondary`}
          >
            {i.label}
          </span>
        ))}
        {no.length > 0 && (
          <span className="text-[12px] text-foreground/45">
            No {no.map((i) => i.label).join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

function TrustFact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className="text-foreground/45">
        {icon}
      </span>
      <span>{label}</span>
    </li>
  );
}

/** "What it costs you" — the page's one fee section. Hero number + rank chip,
 *  comparison bars vs market average and cheapest rival, and the full fee
 *  schedule (with field verdicts) collapsed underneath. */
function CostSection({
  broker: b,
  brokers,
  feeRows,
}: {
  broker: BrokerOffer;
  brokers: BrokerOffer[];
  feeRows: (Row & { cmp?: { label: string; tone: CompareTone } | null })[];
}) {
  const [pot, setPot] = useState<number>(COST_POTS[1]);

  const mine = estAnnualCost(b.fees, pot);
  const rivals = brokers.filter((x) => x.slug !== b.slug);

  if (!rivals.length) return null;

  const rivalCosts = rivals.map((x) => ({
    name: x.name,
    total: estAnnualCost(x.fees, pot).total,
  }));
  const avg = rivalCosts.reduce((a, c) => a + c.total, 0) / rivalCosts.length;
  const cheapest = rivalCosts.reduce((a, c) => (c.total < a.total ? c : a));

  // Rank across all platforms including this one. Ties at the top (several
  // genuinely free platforms) read as "joint cheapest".
  const n = brokers.length;
  const rank =
    1 + rivalCosts.filter((r) => r.total < mine.total - 0.005).length;
  const tied = rivalCosts.some((r) => Math.abs(r.total - mine.total) < 0.005);
  const rankLabel =
    rank === 1
      ? `${tied ? "Joint cheapest" : "Cheapest"} of ${n}`
      : `${ordinal(rank)} cheapest of ${n}`;
  const rankTone: CompareTone =
    rank <= n / 3 ? "good" : rank <= (2 * n) / 3 ? "neutral" : "bad";

  const bars = [
    { label: b.name, total: mine.total, mine: true },
    { label: "Market average", total: avg, mine: false },
    {
      label: `Cheapest rival (${cheapest.name})`,
      total: cheapest.total,
      mine: false,
    },
  ];
  const maxTotal = Math.max(...bars.map((x) => x.total), 1);

  const breakdown = [
    { label: "platform", v: mine.platform },
    { label: "dealing", v: mine.dealing },
    { label: "FX", v: mine.fx },
  ];

  return (
    <section className="mb-12 scroll-mt-28" id="costs">
      <SectionHead
        aside={
          <div className="inline-flex rounded-lg bg-black/[0.05] p-0.5 dark:bg-white/[0.08]">
            {COST_POTS.map((p) => (
              <button
                key={p}
                className={
                  pot === p
                    ? `rounded-md ${BUTTON_SELECTED} px-3 py-1 text-xs font-medium`
                    : "rounded-md px-3 py-1 text-xs font-medium text-foreground/60 transition-colors hover:text-foreground"
                }
                type="button"
                onClick={() => setPot(p)}
              >
                £{p >= 1000 ? `${p / 1000}k` : p}
              </button>
            ))}
          </div>
        }
      >
        What it costs you
      </SectionHead>

      <div className="rounded-2xl border border-separator bg-surface/45 p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-5xl font-semibold tabular-nums tracking-tight text-foreground">
            {fmtMoneyRound(mine.total)}
          </span>
          <span className="text-sm text-foreground/55">
            a year on a £{pot.toLocaleString("en-GB")} pot
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${TONE_CHIP[rankTone]}`}
          >
            {rankLabel}
          </span>
        </div>
        <p className="mt-1 text-xs tabular-nums text-foreground/50">
          {breakdown.map((x) => `${fmtMoneyRound(x.v)} ${x.label}`).join(" · ")}
        </p>

        <div className="mt-5 space-y-3">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span
                  className={
                    bar.mine
                      ? "font-semibold text-foreground/90"
                      : "text-foreground/60"
                  }
                >
                  {bar.label}
                </span>
                <span className="font-medium tabular-nums text-foreground/80">
                  {fmtMoneyRound(bar.total)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.07]">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    bar.mine ? DATA_INK : "bg-foreground/30"
                  }`}
                  style={{
                    width: `${Math.max((bar.total / maxTotal) * 100, 1.5)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <details className="group mt-5 border-t border-separator/60 pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
            Full fee schedule & how we estimate
          </summary>
          <dl className="mt-1 divide-y divide-separator/50 text-[14px]">
            {feeRows.map((r) => (
              <div
                key={r.label}
                className="flex items-start justify-between gap-3 py-2.5"
              >
                <dt className="shrink-0 text-foreground/65">{r.label}</dt>
                <dd className="flex items-baseline justify-end gap-2 text-right text-foreground/90">
                  {r.node}
                  {r.cmp && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${TONE_CHIP[r.cmp.tone]}`}
                    >
                      {r.cmp.label}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] leading-4 text-foreground/45">
            Estimate assumes the pot is invested through the year in 12 monthly
            buys (half UK, half US shares), with the FX fee applied to the
            overseas half. Fees a platform doesn’t publish count as £0; fee caps
            and plan tiers aren’t modelled. Fund charges are separate and apply
            everywhere.
          </p>
        </details>
      </div>
    </section>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;

  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** Breadcrumb broker picker — jump straight to any other broker's page. */
function BrokerSwitcher({
  brokers,
  current,
}: {
  brokers: BrokerOffer[];
  current: BrokerOffer;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sorted = [...brokers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div ref={ref} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-1 font-medium text-foreground/80 transition-colors hover:text-foreground"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        {current.name}
        <ChevronDownIcon
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className="absolute left-0 z-50 mt-2 max-h-80 w-64 overflow-y-auto rounded-xl border border-separator bg-[#f5f0e8] py-1 shadow-lg dark:bg-background"
          role="listbox"
        >
          {sorted.map((x) => (
            <a
              key={x.slug}
              aria-selected={x.slug === current.slug}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${x.slug === current.slug ? "font-semibold text-foreground" : "text-foreground/75"}`}
              href={`/brokers/${x.slug}`}
              role="option"
            >
              <BrokerLogo broker={x} size={22} />
              <span className="flex-1 truncate">{x.name}</span>
              {x.slug === current.slug && (
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-foreground/60" />
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
