// Per-platform detail / review page: /brokers/:slug. Fetches the full (cached)
// /api/brokers list so it can find the row, compute field-relative fee context,
// and cross-sell the top picks. Public, ungated — does not import discretion.
//
// Layout philosophy: editorial rhythm, not a stack of boxes. The hero carries
// the brand (tinted wash from brand_color) and the headline facts as an open
// stat strip; the overview is open prose; only genuinely tabular content sits
// in panels. Cost data is shown, not tabulated — an illustrative annual-cost
// model with comparison bars, and per-fee distribution strips across all
// listed platforms.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BanknotesIcon,
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
): {
  avg: number | null;
  min: number | null;
  max: number | null;
  values: number[];
} {
  const values = brokers.map(sel).filter((v): v is number => v != null);

  if (!values.length) return { avg: null, min: null, max: null, values };

  return {
    avg: values.reduce((a, c) => a + c, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    values,
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

  const stats = useMemo(() => {
    const list = brokers ?? [];

    return {
      plat: fieldStats(list, (x) => x.fees.platform_fee_monthly_gbp),
      uk: fieldStats(list, (x) => x.fees.trade_commission_uk_gbp),
      fx: fieldStats(list, (x) => x.fees.fx_fee_pct),
      minDep: fieldStats(list, (x) => x.fees.min_deposit_gbp),
    };
  }, [brokers]);

  const crossSell = useMemo(
    () => (brokers ?? []).filter((x) => x.recommended && x.slug !== slug),
    [brokers, slug],
  );

  const moreBrokers = useMemo(
    () => (brokers ?? []).filter((x) => x.slug !== slug).slice(0, 8),
    [brokers, slug],
  );

  const compareRows = useMemo(() => {
    if (!b) return [];

    return (
      [
        {
          label: "Platform fee (monthly)",
          value: b.fees.platform_fee_monthly_gbp,
          fmt: fmtMoney,
          stat: stats.plat,
        },
        {
          label: "UK share trade",
          value: b.fees.trade_commission_uk_gbp,
          fmt: fmtMoney,
          stat: stats.uk,
        },
        {
          label: "FX fee",
          value: b.fees.fx_fee_pct,
          fmt: fmtPct,
          stat: stats.fx,
        },
        {
          label: "Minimum deposit",
          value: b.fees.min_deposit_gbp,
          fmt: fmtMoney,
          stat: stats.minDep,
        },
      ] as const
    )
      .map((r) => ({
        ...r,
        cmp: compareToField(r.value, r.stat.avg, r.stat.min),
      }))
      .filter((r) => r.value != null && r.cmp != null);
  }, [b, stats]);

  const navItems = useMemo(() => {
    if (!b) return [];

    return [
      { id: "overview", label: "Overview" },
      { id: "costs", label: "What it costs" },
      ...(compareRows.length
        ? [{ id: "compare", label: "How it compares" }]
        : []),
      ...(b.offer_headline ? [{ id: "offer", label: "Offer" }] : []),
      { id: "fees", label: "Fees" },
      { id: "accounts", label: "Accounts" },
      { id: "assets", label: "Assets" },
      { id: "trust", label: "Trust" },
      { id: "faq", label: "FAQ" },
      ...(b.sources?.length ? [{ id: "sources", label: "Sources" }] : []),
    ];
  }, [b, compareRows.length]);

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

  // Full fee schedule — null rows are dropped rather than printed as noise.
  const feeRows: Row[] = (
    [
      { label: "Charging model", node: b.fees.fee_model },
      { label: "Platform fee note", node: b.fees.platform_fee_note },
      { label: "UK share trade", node: money(b.fees.trade_commission_uk_gbp) },
      { label: "US share trade", node: money(b.fees.trade_commission_us_gbp) },
      { label: "Fund dealing", node: money(b.fees.fund_dealing_gbp) },
      { label: "Withdrawal fee", node: money(b.fees.withdrawal_fee_gbp) },
      { label: "Minimum deposit", node: money(b.fees.min_deposit_gbp) },
      { label: "Inactivity fee", node: b.fees.inactivity_fee_note },
    ] as { label: string; node: React.ReactNode | null }[]
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
                stat strip. Everything at-a-glance lives here; no separate
                summary card. */}
            <header className="relative mb-6 overflow-hidden rounded-3xl border border-separator">
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
                  className={`${subtitle({ fullWidth: true })} mt-4 !text-foreground/80`}
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
                <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-separator/70 pt-5">
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
                <div className="mt-6 flex flex-wrap items-center gap-3 lg:hidden">
                  <BrokerVisitLink
                    broker={b}
                    placement="detail_header"
                    size="lg"
                  />
                  {b.offer_headline && <OfferBadge text={b.offer_headline} />}
                </div>
              </div>
            </header>

            <BrokerDisclosure className="mb-8" />

            {/* Overview — open prose, then a single who-is-it-for panel. */}
            <section className="mb-10 scroll-mt-28" id="overview">
              {b.summary && (
                <p className="text-[17px] leading-relaxed text-foreground/85">
                  {b.summary}
                </p>
              )}
              {(b.pros?.length || b.cons?.length) > 0 && (
                <div className="mt-6 grid gap-x-8 gap-y-6 rounded-2xl border border-separator bg-surface/40 p-5 sm:grid-cols-2 sm:p-6">
                  {b.pros?.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[#17935a] dark:text-[#5fd39a]">
                        Why we rate it
                      </h3>
                      <ul className="space-y-2.5 text-[15px] leading-snug text-foreground/85">
                        {b.pros.map((p) => (
                          <li key={p} className="flex gap-2.5">
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
                    <div className="border-t border-separator/60 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[#c2603f]">
                        What holds it back
                      </h3>
                      <ul className="space-y-2.5 text-[15px] leading-snug text-foreground/85">
                        {b.cons.map((c) => (
                          <li key={c} className="flex gap-2.5">
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

            {/* What it costs — illustrative annual cost with comparison bars. */}
            <CostSection broker={b} brokers={brokers ?? []} />

            {/* How it compares — per-fee distribution strips. */}
            {compareRows.length > 0 && (
              <SpecSection id="compare" title="How it compares">
                <p className="mb-5 text-xs text-foreground/55">
                  Where {b.name} sits across all {brokers!.length} platforms we
                  list — the marked dot is {b.name}; small dots are rivals.
                </p>
                <ul className="space-y-6">
                  {compareRows.map((r) => (
                    <li key={r.label}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-foreground/65">{r.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-medium tabular-nums text-foreground/90">
                            {r.fmt(r.value as number)}
                          </span>
                          {r.cmp && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${TONE_CHIP[r.cmp.tone]}`}
                            >
                              {r.cmp.label}
                            </span>
                          )}
                        </span>
                      </div>
                      <DistributionStrip
                        fmt={r.fmt}
                        stat={r.stat}
                        value={r.value as number}
                      />
                    </li>
                  ))}
                </ul>
              </SpecSection>
            )}

            {/* Offer */}
            {b.offer_headline && (
              <SpecSection id="offer" title="Sign-up offer">
                <OfferBadge text={b.offer_headline} />
                {b.offer_terms && (
                  <p className="mt-2 text-xs text-foreground/55">
                    {b.offer_terms}
                  </p>
                )}
                <div className="mt-3">
                  <BrokerVisitLink broker={b} placement="offer" />
                </div>
              </SpecSection>
            )}

            {/* Fees — headline tiles + collapsible full schedule. */}
            <SpecSection id="fees" title="Fees & costs">
              <dl className="grid grid-cols-3 divide-x divide-separator/60">
                <FeeTile
                  label="Platform fee"
                  value={platformFeeSummary(b.fees)}
                />
                <FeeTile
                  className="pl-4 sm:pl-6"
                  label="UK trade"
                  value={fmtMoney(b.fees.trade_commission_uk_gbp)}
                />
                <FeeTile
                  className="pl-4 sm:pl-6"
                  label="FX fee"
                  value={fmtPct(b.fees.fx_fee_pct)}
                />
              </dl>
              {feeRows.length > 0 && (
                <details className="group mt-5 border-t border-separator/60 pt-4">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                    <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
                    Full fee schedule
                  </summary>
                  <SpecTable rows={feeRows} />
                </details>
              )}
            </SpecSection>

            {/* Accounts — offered wrappers as chips, not ten tick rows. */}
            <SpecSection id="accounts" title="Account types">
              <AvailabilityChips
                items={[
                  { label: "General (GIA)", value: b.accounts.gia },
                  {
                    label: "Stocks & Shares ISA",
                    value: b.accounts.stocks_isa,
                  },
                  { label: "SIPP", value: b.accounts.sipp },
                  { label: "Lifetime ISA", value: b.accounts.lisa },
                  { label: "Junior ISA", value: b.accounts.jisa },
                ]}
              />
              {(b.accounts.isa_note || b.accounts.sipp_note) && (
                <div className="mt-3 space-y-1.5 text-[13px] leading-snug text-foreground/60">
                  {b.accounts.isa_note && <p>{b.accounts.isa_note}</p>}
                  {b.accounts.sipp_note && <p>{b.accounts.sipp_note}</p>}
                </div>
              )}
            </SpecSection>

            {/* Assets */}
            <SpecSection id="assets" title="Assets & markets">
              <AvailabilityChips
                items={[
                  { label: "UK shares", value: b.assets.uk_shares },
                  { label: "US shares", value: b.assets.us_shares },
                  { label: "Global shares", value: b.assets.global_shares },
                  { label: "ETFs", value: b.assets.etfs },
                  { label: "Funds (OEICs)", value: b.assets.mutual_funds },
                  {
                    label: "Investment trusts",
                    value: b.assets.investment_trusts,
                  },
                  {
                    label: "Fractional shares",
                    value: b.assets.fractional_shares,
                  },
                  { label: "Bonds & gilts", value: b.assets.bonds_gilts },
                  { label: "Options", value: b.assets.options },
                  { label: "Crypto", value: b.assets.crypto },
                ]}
              />
              {b.assets.num_markets != null && (
                <p className="mt-3 text-[13px] text-foreground/60">
                  Access to {b.assets.num_markets} markets.
                </p>
              )}
            </SpecSection>

            {/* Trust — icon fact row + feature chips, not a table. */}
            <SpecSection id="trust" title="Trust & features">
              <ul className="flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-foreground/80">
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
              <div className="mt-4 border-t border-separator/60 pt-4">
                <AvailabilityChips
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
                />
                {b.trust.interest_on_cash_note && (
                  <p className="mt-3 flex gap-1.5 text-[13px] leading-snug text-foreground/60">
                    <BanknotesIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{b.trust.interest_on_cash_note}</span>
                  </p>
                )}
              </div>
            </SpecSection>

            {/* FAQ — accordions; the JSON-LD keeps the full text for search. */}
            {faqs.length > 0 && (
              <SpecSection id="faq" title={`${b.name} FAQ`}>
                <div className="divide-y divide-separator/50">
                  {faqs.map((f) => (
                    <details
                      key={f.q}
                      className="group py-3 first:pt-0 last:pb-0"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground/90 [&::-webkit-details-marker]:hidden">
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
              </SpecSection>
            )}

            {/* Sources */}
            {b.sources?.length > 0 && (
              <div className="mt-8 scroll-mt-28" id="sources">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground/55">
                  Sources
                </h2>
                <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-foreground/60">
                  {/* One link per site — most rows cite several pages on the
                      provider's own domain, which printed as a row of
                      identical labels. */}
                  {[...new Map(b.sources.map((s) => [sourceLabel(s), s]))].map(
                    ([label, s]) => (
                      <li key={label}>
                        <a
                          className="underline underline-offset-2 hover:text-foreground/80"
                          href={s}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {label}
                        </a>
                      </li>
                    ),
                  )}
                </ul>
                <p className="mt-2 text-sm text-foreground/60">
                  Figures last checked {fmtVerifiedDate(b.last_verified)}.
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

/** One compact ratings line: leading stars on the best-known score plus the
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

/** Headline fee tile inside the fees panel — open cells with hairline
 *  dividers, "Free" gets the positive ink. */
function FeeTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  const free = value === "Free" || value === "0%";

  return (
    <div className={className}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
        {label}
      </dt>
      <dd
        className={`mt-1 text-xl font-semibold tracking-tight sm:text-2xl ${
          free ? "text-[#17935a] dark:text-[#5fd39a]" : "text-foreground/90"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Feature availability as chips: what's offered as filled chips, what isn't
 *  as one quiet line. Unknown (null) is omitted entirely. */
function AvailabilityChips({
  items,
}: {
  items: { label: string; value: boolean | null | undefined }[];
}) {
  const yes = items.filter((i) => i.value === true);
  const no = items.filter((i) => i.value === false);

  return (
    <div>
      {yes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {yes.map((i) => (
            <span
              key={i.label}
              className={`${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.md} bg-[#e8e0d5] text-foreground/75 dark:bg-surface-secondary`}
            >
              {i.label}
            </span>
          ))}
        </div>
      )}
      {no.length > 0 && (
        <p className="mt-2.5 text-[13px] text-foreground/50">
          Not available: {no.map((i) => i.label).join(", ")}.
        </p>
      )}
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

/** 1-D distribution strip: every platform's value as a quiet dot on a track,
 *  this platform as the accent dot. Values are label-carried (the row above
 *  shows the number), so the strip is context, not the only encoding. */
function DistributionStrip({
  value,
  stat,
  fmt,
}: {
  value: number;
  stat: { min: number | null; max: number | null; values: number[] };
  fmt: (v: number) => string;
}) {
  const { min, max, values } = stat;

  if (min == null || max == null || max === min) return null;

  const pos = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div className="mt-2">
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-separator" />
        {values.map((v, i) => (
          <span
            key={i}
            className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/25"
            style={{ left: `${pos(v)}%` }}
          />
        ))}
        <span
          className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${DATA_INK} ring-2 ring-background`}
          style={{ left: `${pos(value)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-foreground/40">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}

/** "What it costs you" — illustrative annual cost at three pot sizes, as a
 *  hero number plus comparison bars against the market average and the
 *  cheapest rival. All figures direct-labeled; single accent data ink. */
function CostSection({
  broker: b,
  brokers,
}: {
  broker: BrokerOffer;
  brokers: BrokerOffer[];
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
    <SpecSection id="costs" title="What it costs you">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-foreground/55">
          Estimated cost for one year of investing, by pot size.
        </p>
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
      </div>

      <div className="mt-5 flex items-baseline gap-2.5">
        <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
          {fmtMoneyRound(mine.total)}
        </span>
        <span className="text-sm text-foreground/55">
          a year with {b.name} on a £{pot.toLocaleString("en-GB")} pot
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

      <p className="mt-4 text-[11px] leading-4 text-foreground/45">
        Illustrative only: assumes the pot is invested through the year in 12
        monthly buys (half UK, half US shares), with the FX fee applied to the
        overseas half. Fees a platform doesn’t publish count as £0; fee caps and
        plan tiers aren’t modelled. Fund charges are separate and apply
        everywhere.
      </p>
    </SpecSection>
  );
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

function SpecSection({
  id,
  title: heading,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="mb-4 scroll-mt-28 rounded-2xl border border-separator bg-surface/55 p-5"
      id={id}
    >
      <h2 className="mb-3 text-[15px] font-semibold text-foreground/90">
        {heading}
      </h2>
      {children}
    </section>
  );
}

function SpecTable({ rows }: { rows: Row[] }) {
  return (
    <dl className="divide-y divide-separator/50 text-[14px]">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start justify-between gap-3 py-2.5">
          <dt className="shrink-0 text-foreground/65">{r.label}</dt>
          <dd className="text-right text-foreground/90">{r.node}</dd>
        </div>
      ))}
    </dl>
  );
}
