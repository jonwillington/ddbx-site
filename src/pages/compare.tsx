// Public, ungated UK trading-platform comparison + affiliate directory.
// Data: GET /api/brokers?market=UK (ddbx-data). Always public — intentionally
// does NOT import @/lib/discretion. Compliance copy (disclosure, capital-at-
// risk, methodology) is sourced from the FCA/ASA brief and lives in
// @/lib/brokers + @/components/brokers/broker-ui.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { InformationCircleIcon } from "@heroicons/react/20/solid";

import { BrokerAside } from "@/components/brokers/broker-aside";
import { Tooltip } from "@/components/tooltip";
import {
  BadgeChip,
  BrokerComplianceNote,
  BrokerLogo,
  BrokerVisitLink,
  OfferBadge,
  Tick,
} from "@/components/brokers/broker-ui";
import DefaultLayout from "@/layouts/default";
import { title } from "@/components/primitives";
import { api, type BrokerOffer } from "@/lib/api";
import { fmtMoney, fmtPct, platformFeeSummary } from "@/lib/brokers";

type SortKey = "recommended" | "name" | "cost";

interface Filters {
  isa: boolean;
  sipp: boolean;
  lisa: boolean;
  commissionFree: boolean;
  fractional: boolean;
  hasOffer: boolean;
}

const EMPTY_FILTERS: Filters = {
  isa: false,
  sipp: false,
  lisa: false,
  commissionFree: false,
  fractional: false,
  hasOffer: false,
};

const FILTER_DEFS: { key: keyof Filters; label: string }[] = [
  { key: "isa", label: "Stocks ISA" },
  { key: "sipp", label: "SIPP" },
  { key: "lisa", label: "LISA" },
  { key: "commissionFree", label: "Commission-free" },
  { key: "fractional", label: "Fractional shares" },
  { key: "hasOffer", label: "Has sign-up offer" },
];

/** Rough cost score for the "Lowest cost" sort — annualises the monthly fee,
 *  weights the percentage platform fee, and adds trade + FX drag. Ordering
 *  heuristic only; the grid shows the real figures. */
function costScore(b: BrokerOffer): number {
  const f = b.fees;
  return (
    (f.platform_fee_monthly_gbp ?? 0) * 12 +
    (f.platform_fee_pct ?? 0) * 100 +
    (f.trade_commission_uk_gbp ?? 0) * 5 +
    (f.fx_fee_pct ?? 0) * 10
  );
}

function matchesFilters(b: BrokerOffer, f: Filters): boolean {
  if (f.isa && b.accounts.stocks_isa !== true) return false;
  if (f.sipp && b.accounts.sipp !== true) return false;
  if (f.lisa && b.accounts.lisa !== true) return false;
  if (f.commissionFree && b.fees.trade_commission_uk_gbp !== 0) return false;
  if (f.fractional && b.assets.fractional_shares !== true) return false;
  if (f.hasOffer && !b.offer_headline) return false;
  return true;
}

function detailHref(b: BrokerOffer): string {
  return `/brokers/${b.slug}`;
}

// Column divider, matching the deals table (market-row.tsx).
const COL = "border-r border-black/[0.06] dark:border-white/[0.06]";

/** Column header label with an info tooltip — mirrors the deals table's
 *  HeaderLabel (market-row.tsx). */
function ColHeader({
  help,
  children,
}: {
  help: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip
      className="inline-flex cursor-help items-center gap-1 whitespace-nowrap align-middle"
      content={help}
    >
      {children}
      <InformationCircleIcon className="h-3 w-3 shrink-0 text-muted/40" />
    </Tooltip>
  );
}

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "name", label: "Name (A–Z)" },
  { id: "cost", label: "Lowest cost" },
];

/** Deals-style dropdown chip ("Label: Value ▾"), mirroring the FilterSelect in
 *  market-filter-bar.tsx so the compare filters feel like the deals screen. */
function ChipSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value) ?? options[0];

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

  return (
    <div ref={ref} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-full border border-separator bg-surface/40 px-3 py-2 text-xs text-foreground/85 transition-colors hover:border-[#5a4128]/50"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-muted">{label}:</span>
        <span className="font-medium">{current?.label ?? ""}</span>
        <ChevronDownIcon
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-separator bg-[#f5f0e8] py-1 shadow-lg dark:bg-background"
          role="listbox"
        >
          {options.map((opt) => {
            const cur = opt.id === value;

            return (
              <button
                key={opt.id}
                aria-selected={cur}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                role="option"
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                <span className="flex-1 font-medium leading-tight">
                  {opt.label}
                </span>
                {cur && (
                  <CheckIcon className="h-3.5 w-3.5 shrink-0 text-foreground/60" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [brokers, setBrokers] = useState<BrokerOffer[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("recommended");

  useEffect(() => {
    api
      .brokers("UK")
      .then((r) => setBrokers(r))
      .catch((e) => setErr((e as Error).message));
  }, []);

  const topPicks = useMemo(
    () => (brokers ?? []).filter((b) => b.recommended),
    [brokers],
  );

  const visible = useMemo(() => {
    if (!brokers) return [];
    const q = query.trim().toLowerCase();
    const rows = brokers.filter(
      (b) =>
        matchesFilters(b, filters) &&
        (!q ||
          b.name.toLowerCase().includes(q) ||
          b.tagline.toLowerCase().includes(q)),
    );

    const byName = (a: BrokerOffer, b: BrokerOffer) =>
      a.name.localeCompare(b.name);

    if (sort === "name") return [...rows].sort(byName);
    if (sort === "cost")
      return [...rows].sort((a, b) => costScore(a) - costScore(b) || byName(a, b));
    // recommended: top picks first, then editorial rank (nulls last), then name
    return [...rows].sort((a, b) => {
      if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
      const ra = a.rank ?? Number.MAX_SAFE_INTEGER;
      const rb = b.rank ?? Number.MAX_SAFE_INTEGER;
      return ra - rb || byName(a, b);
    });
  }, [brokers, query, filters, sort]);

  const anyFilter =
    query.trim() !== "" || Object.values(filters).some(Boolean);

  return (
    <DefaultLayout drawerRight>
      <BrokerAside brokers={brokers} />
      <section className="w-full">
        <header className="mb-6">
          <h1 className={title({ size: "sm" })}>Compare UK trading platforms</h1>
        </header>

        {err && (
          <p className="text-sm text-foreground/60">
            Couldn’t load the comparison ({err}). Please try again shortly.
          </p>
        )}

        {!brokers && !err && <ComparisonSkeleton />}

        {brokers && (
          <>
            {topPicks.length > 0 && (
              <div className="mb-8 lg:hidden">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/50">
                  Our top picks
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {topPicks.map((b) => (
                    <TopPickCard key={b.slug} broker={b} />
                  ))}
                </div>
              </div>
            )}

            {/* Filter bar — styled to match the deals filter strip
                (market-filter-bar.tsx): cream strip, rounded-full search pill,
                deals-style dropdown + chips. */}
            <div className="mb-4 rounded-2xl border border-separator bg-[#faf7f2] px-4 py-3.5 dark:bg-surface">
              <div className="flex items-center gap-3">
                <input
                  className="min-w-0 flex-1 rounded-full border border-separator bg-transparent px-4 py-2 text-sm text-foreground transition-colors placeholder:text-muted/60 focus:border-[#5a4128]/50 focus:outline-none"
                  placeholder="Search platforms…"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="shrink-0">
                  <ChipSelect
                    label="Sort"
                    options={SORT_OPTIONS}
                    value={sort}
                    onChange={(id) => setSort(id as SortKey)}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {FILTER_DEFS.map(({ key, label }) => {
                  const active = filters[key];

                  return (
                    <button
                      key={key}
                      aria-pressed={active}
                      className={
                        active
                          ? "rounded-full border border-[#5a4128]/50 bg-[#5a4128]/[0.08] px-3 py-1.5 text-xs font-medium text-[#5a4128] transition-colors dark:text-[#d8c4af]"
                          : "rounded-full border border-separator bg-surface/40 px-3 py-1.5 text-xs text-foreground/85 transition-colors hover:border-[#5a4128]/50"
                      }
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({ ...f, [key]: !f[key] }))
                      }
                    >
                      {label}
                    </button>
                  );
                })}
                {anyFilter && (
                  <button
                    className="ml-1 text-xs text-muted underline underline-offset-2 transition-colors hover:text-foreground"
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setFilters(EMPTY_FILTERS);
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <p className="mb-3 text-xs text-foreground/40">
              {visible.length} of {brokers.length} platforms
            </p>

            {/* Desktop comparison table — deals-table styling (market-row.tsx):
                flex rows, column right-borders, uppercase header strip. */}
            <div className="hidden overflow-hidden rounded-xl border border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-surface md:block">
              {/* Header */}
              <div className="flex items-stretch select-none border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.05] text-[10px] font-medium uppercase tracking-wider text-muted/80">
                <div className={`flex-1 min-w-0 px-3 py-2 ${COL}`}>
                  <ColHeader help="The trading or investment platform, and who it’s best for.">
                    Platform
                  </ColHeader>
                </div>
                <div className={`w-36 shrink-0 px-3 py-2 ${COL}`}>
                  <ColHeader help="The recurring account/platform charge — a flat monthly fee, an annual percentage of your investments, or free.">
                    Platform fee
                  </ColHeader>
                </div>
                <div className={`w-28 shrink-0 px-3 py-2 text-right ${COL}`}>
                  <ColHeader help="Commission to buy or sell a UK share. ‘Free’ means commission-free dealing.">
                    UK trade
                  </ColHeader>
                </div>
                <div className={`w-24 shrink-0 px-3 py-2 text-right ${COL}`}>
                  <ColHeader help="Currency-conversion fee charged on trades in non-GBP shares (e.g. US stocks).">
                    FX fee
                  </ColHeader>
                </div>
                <div className={`w-16 shrink-0 px-2 py-2 text-center ${COL}`}>
                  <ColHeader help="Offers a Stocks & Shares ISA — invest tax-free up to the annual allowance.">
                    ISA
                  </ColHeader>
                </div>
                <div className={`w-16 shrink-0 px-2 py-2 text-center ${COL}`}>
                  <ColHeader help="Offers a SIPP — a self-invested personal pension you choose your own holdings in.">
                    SIPP
                  </ColHeader>
                </div>
                <div className={`w-20 shrink-0 px-2 py-2 text-center ${COL}`}>
                  <ColHeader help="Lets you buy fractional shares — a slice of a share, so you can invest small amounts.">
                    Frac.
                  </ColHeader>
                </div>
                <div className={`w-16 shrink-0 px-2 py-2 text-center ${COL}`}>
                  <ColHeader help="Covered by the FSCS — up to £85,000 protected if the provider fails.">
                    FSCS
                  </ColHeader>
                </div>
                <div className="w-32 shrink-0 px-3 py-2" />
              </div>
              {/* Rows */}
              <div className="divide-y divide-black/[0.06] dark:divide-separator">
                {visible.map((b) => (
                  <div
                    key={b.slug}
                    className="flex items-stretch transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5"
                  >
                    <div
                      className={`flex-1 min-w-0 px-3 py-3 flex items-center gap-3 ${COL}`}
                    >
                      <BrokerLogo broker={b} size={44} />
                      <div className="min-w-0">
                        <a
                          className="block truncate text-[15px] font-semibold leading-tight text-foreground hover:underline"
                          href={detailHref(b)}
                        >
                          {b.name}
                        </a>
                        {b.badges.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {b.badges.slice(0, 2).map((bd) => (
                              <BadgeChip key={bd} badge={bd} />
                            ))}
                          </div>
                        )}
                        <p className="mt-1 truncate text-[11px] text-muted">
                          {b.tagline}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-36 shrink-0 px-3 py-3 flex items-center text-[13px] text-foreground/80 ${COL}`}
                    >
                      {platformFeeSummary(b.fees)}
                    </div>
                    <div
                      className={`w-28 shrink-0 px-3 py-3 flex items-center justify-end text-[13px] tabular-nums text-foreground/80 ${COL}`}
                    >
                      {fmtMoney(b.fees.trade_commission_uk_gbp)}
                    </div>
                    <div
                      className={`w-24 shrink-0 px-3 py-3 flex items-center justify-end text-[13px] tabular-nums text-foreground/80 ${COL}`}
                    >
                      {fmtPct(b.fees.fx_fee_pct)}
                    </div>
                    <div
                      className={`w-16 shrink-0 px-2 py-3 flex items-center justify-center ${COL}`}
                    >
                      <Tick value={b.accounts.stocks_isa} />
                    </div>
                    <div
                      className={`w-16 shrink-0 px-2 py-3 flex items-center justify-center ${COL}`}
                    >
                      <Tick value={b.accounts.sipp} />
                    </div>
                    <div
                      className={`w-20 shrink-0 px-2 py-3 flex items-center justify-center ${COL}`}
                    >
                      <Tick value={b.assets.fractional_shares} />
                    </div>
                    <div
                      className={`w-16 shrink-0 px-2 py-3 flex items-center justify-center ${COL}`}
                    >
                      <Tick value={b.trust.fscs_protected} />
                    </div>
                    <div className="w-32 shrink-0 px-3 py-3 flex items-center justify-end">
                      <BrokerVisitLink
                        broker={b}
                        placement="grid"
                        variant="grey"
                      >
                        Visit
                      </BrokerVisitLink>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {visible.map((b) => (
                <BrokerCard key={b.slug} broker={b} />
              ))}
            </div>

            {visible.length === 0 && (
              <p className="py-10 text-center text-sm text-foreground/50">
                No platforms match those filters.
              </p>
            )}

            <BrokerComplianceNote className="mt-10 mb-12" />
          </>
        )}
      </section>
    </DefaultLayout>
  );
}

function TopPickCard({ broker: b }: { broker: BrokerOffer }) {
  return (
    <div className="rounded-2xl border border-[#5a4128]/30 bg-surface/60 p-4 dark:border-[#d8c4af]/25">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <BrokerLogo broker={b} size={52} />
          <div>
            <a
              className="text-lg font-semibold text-foreground hover:underline"
              href={detailHref(b)}
            >
              {b.name}
            </a>
            <p className="mt-1 text-sm text-foreground/60">{b.tagline}</p>
          </div>
        </div>
        {b.badges.includes("top_pick") && <BadgeChip badge="top_pick" />}
      </div>
      {b.offer_headline && <OfferBadge className="mt-3" text={b.offer_headline} />}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-foreground/60">
        <span>Platform fee: {platformFeeSummary(b.fees)}</span>
        <span>UK trade: {fmtMoney(b.fees.trade_commission_uk_gbp)}</span>
        <span>FX: {fmtPct(b.fees.fx_fee_pct)}</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <BrokerVisitLink broker={b} placement="top_pick" size="lg" />
        <a
          className="text-sm text-foreground/55 underline underline-offset-2 hover:text-foreground"
          href={detailHref(b)}
        >
          Full review
        </a>
      </div>
    </div>
  );
}

function BrokerCard({ broker: b }: { broker: BrokerOffer }) {
  return (
    <div className="rounded-2xl border border-separator bg-surface/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <BrokerLogo broker={b} size={44} />
          <a
            className="font-semibold text-foreground hover:underline"
            href={detailHref(b)}
          >
            {b.name}
          </a>
        </div>
        {b.badges[0] && <BadgeChip badge={b.badges[0]} />}
      </div>
      <p className="mt-1.5 text-xs text-foreground/55">{b.tagline}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <Fact label="Platform fee" value={platformFeeSummary(b.fees)} />
        <Fact label="UK trade" value={fmtMoney(b.fees.trade_commission_uk_gbp)} />
        <Fact label="FX fee" value={fmtPct(b.fees.fx_fee_pct)} />
        <Fact label="Min deposit" value={fmtMoney(b.fees.min_deposit_gbp)} />
      </dl>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/60">
        <span className="inline-flex items-center gap-1">
          ISA <Tick value={b.accounts.stocks_isa} />
        </span>
        <span className="inline-flex items-center gap-1">
          SIPP <Tick value={b.accounts.sipp} />
        </span>
        <span className="inline-flex items-center gap-1">
          Fractional <Tick value={b.assets.fractional_shares} />
        </span>
        <span className="inline-flex items-center gap-1">
          FSCS <Tick value={b.trust.fscs_protected} />
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <BrokerVisitLink broker={b} placement="card" />
        <a
          className="text-sm text-foreground/55 underline underline-offset-2 hover:text-foreground"
          href={detailHref(b)}
        >
          Details
        </a>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-foreground/45">{label}</dt>
      <dd className="text-foreground/80">{value}</dd>
    </div>
  );
}

function ComparisonSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-32 rounded-2xl bg-surface" />
        <div className="h-32 rounded-2xl bg-surface" />
      </div>
      <div className="h-10 rounded-xl bg-surface" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-surface" />
      ))}
    </div>
  );
}
