// Public, ungated UK trading-platform comparison + affiliate directory.
// Data: GET /api/brokers?market=UK (ddbx-data). Always public — intentionally
// does NOT import @/lib/discretion. Compliance copy (disclosure, capital-at-
// risk, methodology) is sourced from the FCA/ASA brief and lives in
// @/lib/brokers + @/components/brokers/broker-ui.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";

import { BrokerAside } from "@/components/brokers/broker-aside";
import { ColHeader } from "@/components/brokers/broker-page-ui";
import {
  BadgeChip,
  BrokerComplianceNote,
  BrokerDisclosure,
  BrokerLogo,
  BrokerVisitLink,
  OfferBadge,
  Tick,
} from "@/components/brokers/broker-ui";
import DefaultLayout from "@/layouts/default";
import { Skeleton } from "@/components/skeleton";
import { api, type BrokerOffer } from "@/lib/api";
import {
  fmtMoney,
  fmtPct,
  isOfferLive,
  platformFeeSummary,
} from "@/lib/brokers";

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
  if (f.hasOffer && !isOfferLive(b)) return false;

  return true;
}

function detailHref(b: BrokerOffer): string {
  return `/brokers/${b.slug}`;
}

// Column divider, on the broker family's hairline rather than the deals
// table's black-alpha edge.
const COL = "border-r border-hairline dark:border-separator";

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
        className="flex items-center gap-1.5 rounded-full border border-separator bg-surface/40 px-3 py-2 text-xs text-foreground/85 transition-colors hover:border-brand-brown/50"
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
      return [...rows].sort(
        (a, b) => costScore(a) - costScore(b) || byName(a, b),
      );

    // recommended: top picks first, then editorial rank (nulls last), then name
    return [...rows].sort((a, b) => {
      if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
      const ra = a.rank ?? Number.MAX_SAFE_INTEGER;
      const rb = b.rank ?? Number.MAX_SAFE_INTEGER;

      return ra - rb || byName(a, b);
    });
  }, [brokers, query, filters, sort]);

  const anyFilter = query.trim() !== "" || Object.values(filters).some(Boolean);

  return (
    // hideMobileCta like the reviews and the guides: every mobile card here
    // carries its own Visit button, and the pinned app bar sat on top of them.
    <DefaultLayout drawerRight hideMobileCta>
      <BrokerAside brokers={brokers} />
      <section className="w-full">
        <header className="mb-5">
          <p className="pt-5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan">
            Broker guide
          </p>
          <h1 className="mt-2 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[38px]">
            Compare UK trading platforms
          </h1>
          <p className="mt-4 max-w-[62ch] text-[16.5px] leading-[1.6] tracking-[-0.006em] text-foreground/85">
            Every UK investing platform we hold on file, with what each one
            charges to hold your money, to trade, and to convert currency —
            filterable by the accounts you actually need.
          </p>
        </header>

        {/* Unconditional, in the document rather than the rail: the rail is
            hidden below 1024px, so every phone visitor was being served
            affiliate links with no disclosure on screen. */}
        <BrokerDisclosure className="mb-5" />

        {/* The raw `err` string used to be interpolated here. It's a fetch or
            status message written for a log, not for a reader, and it never
            told anyone what to do — so it stays out of the copy. */}
        {err && (
          <p className="text-sm text-foreground/60" role="alert">
            Unable to load the comparison. Reload the page, or try again in a
            few minutes.
          </p>
        )}

        {!brokers && !err && <ComparisonSkeleton />}

        {brokers && (
          <>
            {topPicks.length > 0 && (
              <div className="mb-8 lg:hidden">
                <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/50">
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
            <div className="mb-4 rounded-2xl border border-separator bg-sheet px-4 py-3.5 dark:bg-surface">
              <div className="flex items-center gap-3">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Search platforms</span>
                  <input
                    className="w-full rounded-full border border-separator bg-transparent px-4 py-2 text-base text-foreground transition-colors placeholder:text-muted/60 focus:border-brand-brown/50 focus:outline-none sm:text-sm"
                    placeholder="Search platforms…"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
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
                          ? "rounded-full border border-brand-brown/50 bg-brand-brown/[0.08] px-3 py-1.5 text-xs font-medium text-brand-brown transition-colors dark:text-[#d8c4af]"
                          : "rounded-full border border-separator bg-surface/40 px-3 py-1.5 text-xs text-foreground/85 transition-colors hover:border-brand-brown/50"
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

            {/* Desktop comparison table — deals-table geometry (market-row.tsx)
                on the broker family's hairlines and sentence-case headers. */}
            <div className="hidden overflow-hidden rounded-xl border border-hairline bg-white dark:border-separator dark:bg-surface md:block">
              {/* Header */}
              <div className="flex items-stretch select-none border-b border-hairline dark:border-separator bg-black/[0.04] dark:bg-white/[0.05] text-[11px] leading-none font-medium text-foreground/50">
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
              <div className="divide-y divide-hairline dark:divide-separator">
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
    <div className="rounded-2xl border border-brand-brown/30 bg-surface/60 p-4 dark:border-[#d8c4af]/25">
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
      {isOfferLive(b) && (
        <OfferBadge className="mt-3" text={b.offer_headline!} />
      )}
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
        <Fact
          label="UK trade"
          value={fmtMoney(b.fees.trade_commission_uk_gbp)}
        />
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
          Full review
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

/** Roughly a viewport of rows. The real grid loads every platform we hold
 *  (~19), but the count isn't known before the fetch, so the skeleton draws the
 *  fold and lets the rest arrive below it — under-drawing the fold is what
 *  makes the page jump. */
const SKELETON_ROWS = 8;

/** The loading state at the loaded page's own geometry.
 *
 *  The previous version drew two pick cards at every width — they're lg:hidden
 *  in the real layout, so desktop was shown two objects that never arrived —
 *  above a 40px bar and six 56px rows, against a ~108px filter bar and ~76px
 *  rows. The net effect was a redraw, which is the behaviour the house
 *  `Skeleton` primitive and the guides' real-geometry skeletons exist to kill.
 */
function ComparisonSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading platforms…</span>

      {/* Top picks: mobile and tablet only, matching the real block's
          `lg:hidden`. */}
      <div className="mb-8 lg:hidden">
        <Skeleton className="mb-3 h-[11px] w-24" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="w-full rounded-2xl" h={200} />
          <Skeleton className="w-full rounded-2xl" h={200} />
        </div>
      </div>

      {/* Filter bar (search row + chip row), then the "N of M platforms" line. */}
      <Skeleton className="mb-4 w-full rounded-2xl" h={108} />
      <Skeleton className="mb-3 h-[12px] w-32" />

      {/* Inside the real container, so the table's own frame and header strip
          don't arrive with the data. */}
      <div className="hidden overflow-hidden rounded-xl border border-hairline bg-white dark:border-separator dark:bg-surface md:block">
        <div className="h-7 border-b border-hairline bg-black/[0.04] dark:border-separator dark:bg-white/[0.05]" />
        <div className="divide-y divide-hairline dark:divide-separator">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="shrink-0 rounded-lg" h={44} w={44} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-[15px] w-40" />
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-[11px] w-56" />
              </div>
              <Skeleton className="h-[13px] w-24 shrink-0" />
              <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* The card stack the same rows become below md. */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="w-full rounded-2xl" h={244} />
        ))}
      </div>
    </div>
  );
}
