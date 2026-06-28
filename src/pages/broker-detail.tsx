// Per-platform detail / review page: /brokers/:slug. Fetches the full (cached)
// /api/brokers list so it can find the row, compute field-relative fee context,
// and cross-sell the top picks. Public, ungated — does not import discretion.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";

import { BrokerBuyBoxAside } from "@/components/brokers/broker-aside";
import {
  BadgeChip,
  BoolValue,
  BrokerComplianceNote,
  BrokerDisclosure,
  BrokerLogo,
  BrokerVisitLink,
  OfferBadge,
  RatingsStrip,
} from "@/components/brokers/broker-ui";
import DefaultLayout from "@/layouts/default";
import { subtitle, title } from "@/components/primitives";
import { api, type BrokerOffer } from "@/lib/api";
import {
  type CompareTone,
  compareToField,
  fmtMoney,
  fmtPct,
  platformFeeSummary,
  sourceLabel,
} from "@/lib/brokers";

type Row = { label: string; node: React.ReactNode };

function fieldStats(
  brokers: BrokerOffer[],
  sel: (b: BrokerOffer) => number | null | undefined,
): { avg: number | null; min: number | null } {
  const nums = brokers
    .map(sel)
    .filter((v): v is number => v != null);
  if (!nums.length) return { avg: null, min: null };
  return { avg: nums.reduce((a, c) => a + c, 0) / nums.length, min: Math.min(...nums) };
}

const TONE_CHIP: Record<CompareTone, string> = {
  good: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  bad: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  neutral: "bg-black/[0.06] text-foreground/60 dark:bg-white/10",
};

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
        { label: "Platform fee (monthly)", value: b.fees.platform_fee_monthly_gbp, fmt: fmtMoney, stat: stats.plat },
        { label: "UK share trade", value: b.fees.trade_commission_uk_gbp, fmt: fmtMoney, stat: stats.uk },
        { label: "FX fee", value: b.fees.fx_fee_pct, fmt: fmtPct, stat: stats.fx },
        { label: "Minimum deposit", value: b.fees.min_deposit_gbp, fmt: fmtMoney, stat: stats.minDep },
      ] as const
    )
      .map((r) => ({ ...r, cmp: compareToField(r.value, r.stat.avg, r.stat.min) }))
      .filter((r) => r.value != null && r.cmp != null);
  }, [b, stats]);

  const navItems = useMemo(() => {
    if (!b) return [];
    return [
      { id: "overview", label: "Overview" },
      ...(compareRows.length ? [{ id: "compare", label: "How it compares" }] : []),
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
          <div className="h-9 w-1/3 rounded bg-surface" />
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

  const NS = <span className="text-foreground/40">Not stated</span>;
  const money = (v: number | null) => (v == null ? NS : fmtMoney(v));
  const pct = (v: number | null) => (v == null ? NS : fmtPct(v));

  const feeRows: Row[] = [
    { label: "Charging model", node: b.fees.fee_model ?? NS },
    { label: "Platform fee", node: platformFeeSummary(b.fees) },
    ...(b.fees.platform_fee_note
      ? [{ label: "Platform fee note", node: b.fees.platform_fee_note }]
      : []),
    { label: "UK share trade", node: money(b.fees.trade_commission_uk_gbp) },
    { label: "US share trade", node: money(b.fees.trade_commission_us_gbp) },
    { label: "Fund dealing", node: money(b.fees.fund_dealing_gbp) },
    { label: "FX fee", node: pct(b.fees.fx_fee_pct) },
    { label: "Withdrawal fee", node: money(b.fees.withdrawal_fee_gbp) },
    { label: "Minimum deposit", node: money(b.fees.min_deposit_gbp) },
    ...(b.fees.inactivity_fee_note
      ? [{ label: "Inactivity fee", node: b.fees.inactivity_fee_note }]
      : []),
  ];

  const accountRows: Row[] = [
    { label: "General (GIA)", node: <BoolValue value={b.accounts.gia} /> },
    { label: "Stocks & Shares ISA", node: <BoolValue value={b.accounts.stocks_isa} /> },
    { label: "SIPP", node: <BoolValue value={b.accounts.sipp} /> },
    { label: "Lifetime ISA", node: <BoolValue value={b.accounts.lisa} /> },
    { label: "Junior ISA", node: <BoolValue value={b.accounts.jisa} /> },
    ...(b.accounts.isa_note
      ? [{ label: "ISA note", node: b.accounts.isa_note }]
      : []),
    ...(b.accounts.sipp_note
      ? [{ label: "SIPP note", node: b.accounts.sipp_note }]
      : []),
  ];

  const assetRows: Row[] = [
    { label: "UK shares", node: <BoolValue value={b.assets.uk_shares} /> },
    { label: "US shares", node: <BoolValue value={b.assets.us_shares} /> },
    { label: "Global shares", node: <BoolValue value={b.assets.global_shares} /> },
    { label: "ETFs", node: <BoolValue value={b.assets.etfs} /> },
    { label: "Funds (OEICs)", node: <BoolValue value={b.assets.mutual_funds} /> },
    { label: "Investment trusts", node: <BoolValue value={b.assets.investment_trusts} /> },
    { label: "Fractional shares", node: <BoolValue value={b.assets.fractional_shares} /> },
    { label: "Bonds & gilts", node: <BoolValue value={b.assets.bonds_gilts} /> },
    { label: "Options", node: <BoolValue value={b.assets.options} /> },
    { label: "Crypto", node: <BoolValue value={b.assets.crypto} /> },
  ];

  const trustRows: Row[] = [
    { label: "FSCS protected", node: <BoolValue value={b.trust.fscs_protected} /> },
    { label: "Regulator", node: b.trust.regulator ?? NS },
    { label: "Founded", node: b.trust.year_founded ?? NS },
    { label: "Headquarters", node: b.trust.headquarters ?? NS },
    {
      label: "Interest on cash",
      node: b.trust.interest_on_cash_note ?? <BoolValue value={b.trust.interest_on_cash} />,
    },
    { label: "Auto-invest", node: <BoolValue value={b.trust.auto_invest} /> },
    { label: "Dividend reinvestment", node: <BoolValue value={b.trust.dividend_reinvestment} /> },
    { label: "Web platform", node: <BoolValue value={b.trust.web_platform} /> },
    { label: "Mobile app", node: <BoolValue value={b.trust.mobile_app} /> },
  ];

  const atGlanceRows: Row[] = [
    { label: "Platform fee", node: platformFeeSummary(b.fees) },
    { label: "UK trade", node: money(b.fees.trade_commission_uk_gbp) },
    { label: "FX fee", node: pct(b.fees.fx_fee_pct) },
    {
      label: "Accounts",
      node:
        [b.accounts.stocks_isa && "ISA", b.accounts.sipp && "SIPP"]
          .filter(Boolean)
          .join(" + ") || "General only",
    },
    { label: "Fractional", node: <BoolValue value={b.assets.fractional_shares} /> },
    { label: "FSCS", node: b.trust.fscs_protected ? "Protected" : "Not listed" },
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
                      ? "inline-flex rounded-lg bg-[#5a4128] px-3 py-1.5 text-xs font-medium text-white dark:bg-[#d8c4af] dark:text-[#1a140d]"
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
        {/* Hero */}
        <header className="mb-6">
          <div className="flex items-center gap-4">
            <BrokerLogo broker={b} size={64} />
            <div className="min-w-0">
              <h1 className={title({ size: "sm" })}>{b.name}</h1>
              <p className={subtitle({ fullWidth: true })}>{b.tagline}</p>
            </div>
          </div>

          <RatingsStrip broker={b} className="mt-4" />

          {b.badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {b.badges.map((bd) => (
                <BadgeChip key={bd} badge={bd} />
              ))}
            </div>
          )}

          {/* At a glance */}
          <div className="mt-4 rounded-2xl border border-separator bg-surface/55 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground/85">
                At a glance
              </h2>
              <span className="text-[11px] text-foreground/45">
                Verified {b.last_verified}
              </span>
            </div>
            <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {atGlanceRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-separator/70 bg-background/50 px-3 py-2"
                >
                  <dt className="text-xs text-foreground/65">{row.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground/90">
                    {row.node}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero CTA (desktop relies on the rail buy-box; this covers tablet) */}
          <div className="mt-5 flex flex-wrap items-center gap-3 lg:hidden">
            <BrokerVisitLink broker={b} placement="detail_header" size="lg" />
            {b.offer_headline && <OfferBadge text={b.offer_headline} />}
          </div>

          <BrokerDisclosure className="mt-4" />
        </header>

        {/* Overview */}
        <section id="overview" className="mb-8 scroll-mt-28">
          {b.summary && (
            <p className="text-base leading-relaxed text-foreground/85">
              {b.summary}
            </p>
          )}
          {(b.pros?.length || b.cons?.length) && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {b.pros?.length > 0 && (
                <div className="rounded-2xl border border-separator bg-surface/40 p-4">
                  <h3 className="mb-2 text-base font-semibold text-[#17935a] dark:text-[#5fd39a]">
                    Pros
                  </h3>
                  <ul className="space-y-2 text-[15px] text-foreground/85">
                    {b.pros.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span aria-hidden>+</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {b.cons?.length > 0 && (
                <div className="rounded-2xl border border-separator bg-surface/40 p-4">
                  <h3 className="mb-2 text-base font-semibold text-[#c2603f]">
                    Cons
                  </h3>
                  <ul className="space-y-2 text-[15px] text-foreground/85">
                    {b.cons.map((c) => (
                      <li key={c} className="flex gap-2">
                        <span aria-hidden>−</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* How it compares */}
        {compareRows.length > 0 && (
          <SpecSection id="compare" title="How it compares">
            <p className="mb-3 text-xs text-foreground/55">
              {b.name}’s costs versus the average across all {brokers!.length}{" "}
              platforms we list.
            </p>
            <ul className="space-y-2.5">
              {compareRows.map((r) => (
                <li
                  key={r.label}
                  className="flex items-center justify-between gap-3 text-sm"
                >
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
                    <span className="hidden text-[11px] text-foreground/40 sm:inline">
                      avg {r.fmt(Math.round((r.stat.avg ?? 0) * 100) / 100)}
                    </span>
                  </span>
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
              <p className="mt-2 text-xs text-foreground/55">{b.offer_terms}</p>
            )}
            <div className="mt-3">
              <BrokerVisitLink broker={b} placement="offer" />
            </div>
          </SpecSection>
        )}

        {/* Spec tables */}
        <div className="grid gap-5 md:grid-cols-2">
          <SpecSection id="fees" title="Fees & costs">
            <SpecTable rows={feeRows} />
          </SpecSection>
          <SpecSection id="accounts" title="Account types">
            <SpecTable rows={accountRows} />
          </SpecSection>
          <SpecSection id="assets" title="Assets & markets">
            <SpecTable rows={assetRows} />
          </SpecSection>
          <SpecSection id="trust" title="Trust & features">
            <SpecTable rows={trustRows} />
          </SpecSection>
        </div>

        {/* FAQ */}
        {faqs.length > 0 && (
          <SpecSection id="faq" title={`${b.name} FAQ`}>
            <dl className="divide-y divide-separator/50">
              {faqs.map((f) => (
                <div key={f.q} className="py-3 first:pt-0 last:pb-0">
                  <dt className="text-sm font-semibold text-foreground/90">
                    {f.q}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-foreground/70">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
            <script
              dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
              type="application/ld+json"
            />
          </SpecSection>
        )}

        {/* Sources */}
        {b.sources?.length > 0 && (
          <div id="sources" className="mt-8 scroll-mt-28">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground/55">
              Sources
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-foreground/60">
              {b.sources.map((s) => (
                <li key={s}>
                  <a
                    className="underline underline-offset-2 hover:text-foreground/80"
                    href={s}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {sourceLabel(s)}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-foreground/60">
              Figures last checked {b.last_verified}. Always confirm current
              terms on {b.name}’s own site.
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
                  <p className="mt-2 text-sm text-foreground/60">{p.tagline}</p>
                  {p.offer_headline && (
                    <OfferBadge className="mt-3" text={p.offer_headline} />
                  )}
                  <p className="mt-3 text-xs text-foreground/55">
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
      id={id}
      className="mb-4 scroll-mt-28 rounded-2xl border border-separator bg-surface/55 p-5"
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
          <dt className="text-foreground/65">{r.label}</dt>
          <dd className="text-right text-foreground/90">{r.node}</dd>
        </div>
      ))}
    </dl>
  );
}
