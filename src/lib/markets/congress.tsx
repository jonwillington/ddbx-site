// CongressMarket — the USG (US congressional / STOCK Act) plugin for
// <MarketPage />. Ratingless market (like SE/NL): no deep-analysis pipeline,
// so "Signal" is the deterministic triage verdict (jurisdiction + notable
// size/options) rather than a Rating. Buys only — sales/junk are dropped
// server-side. Member portraits (public-domain) show in the detail drawer.
import type { ReactNode } from "react";
import type { MarketConfig, MarketDealing, Tone } from "@/lib/markets/types";
import type { GovDealing } from "@/types/ddbx";
import type { PriceFormat } from "@/components/position-card";

import { api } from "@/lib/api";

const SPY_TICKER = "^GSPC";
const SPY_LABEL = "S&P 500";

const USD_FORMAT: PriceFormat = {
  formatPrice: (n) => `$${n.toFixed(2)}`,
  formatValue: (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n),
  quoteToValue: 1,
};

/** Amounts are disclosed as a BAND — format the range, never a false-precision
 *  point value. */
const k = (n: number): string => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : `$${Math.round(n / 1000)}k`);
function formatBand(min: number | null, max: number | null): string {
  if (min == null) return "—";
  return max == null ? `over ${k(min)}` : `${k(min)}–${k(max)}`;
}

const partyState = (r: GovDealing["reporter"]): string =>
  [r.party, r.state].filter(Boolean).join("-") + (r.district != null ? `-${r.district}` : "");

/* ─── Wire → MarketDealing ───────────────────────────────────────────── */

export function toMarketDealing(d: GovDealing): MarketDealing<GovDealing> {
  const buy = d.transaction_type === "purchase";
  const isOption = d.asset_type === "option";
  return {
    key: d.id,
    id: d.id,
    ticker: d.ticker ?? "",
    company: d.company,
    insiderName: d.reporter.name,
    insiderRole: partyState(d.reporter) || (d.reporter.chamber === "senate" ? "Senate" : "House"),
    disclosedDate: d.disclosed_date,
    tradeDate: d.trade_date,
    isPurchase: buy,
    // Band midpoint — a sort/scale proxy only; the real band shows in the row
    // cell + detail drawer.
    value: d.amount_mid ?? null,
    entryPrice: null, // PTRs carry no per-share price
    shares: 0,
    legCount: 1,
    triageVerdict: d.triage?.verdict,
    sector: d.sector_normalized ?? undefined,
    cluster: d.cluster ?? null,
    actionLabel: isOption ? "Options purchase" : "Open-market buy",
    actionTone: "buy" as Tone,
    raw: d,
  };
}

/* ─── Slot components ────────────────────────────────────────────────── */

const VERDICT_STYLE: Record<string, string> = {
  promising: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  maybe: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  skip: "border-[#d8d0c6]/55 text-[#a89e8c] dark:text-foreground/40",
};

function Chip({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-md border whitespace-nowrap px-2 py-0.5 text-[11px] uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function CongressRowActionCell({ dealing }: { dealing: MarketDealing<GovDealing> }) {
  const d = dealing.raw;
  const v = d.triage?.verdict ?? "skip";
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="font-semibold tabular-nums text-sm">{formatBand(d.amount_min, d.amount_max)}</span>
      <div className="flex gap-1">
        {d.asset_type === "option" && <Chip label="options" cls="border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300" />}
        {v !== "skip" && <Chip label={v} cls={VERDICT_STYLE[v]} />}
      </div>
    </div>
  );
}

function CongressDetailBody({ dealing }: { dealing: MarketDealing<GovDealing> }) {
  const d = dealing.raw;
  const r = d.reporter;
  const committees = (r.committees ?? []).filter((c) => c.includes("Committee"));
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {r.photo_url ? (
          <img alt="" className="h-14 w-14 rounded-full object-cover bg-foreground/10" loading="lazy" src={r.photo_url} />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold text-foreground/50">
            {r.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
        )}
        <div>
          <div className="text-lg font-semibold">{r.name}</div>
          <div className="text-sm text-foreground/60">
            {partyState(r)} · {r.chamber === "senate" ? "Senate" : "House"}
          </div>
        </div>
      </div>

      {committees.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-foreground/45 mb-1">Committees</div>
          <div className="text-sm text-foreground/80">
            {committees.map((c) => c.replace("House Committee on ", "").replace("Permanent Select Committee on ", "")).join(" · ")}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Company">{d.company}{d.ticker ? ` (${d.ticker})` : ""}</Field>
        <Field label="Type">{d.asset_type === "option" ? "Option purchase" : "Stock purchase"}</Field>
        <Field label="Amount">{formatBand(d.amount_min, d.amount_max)}</Field>
        <Field label="Owner">{d.owner}</Field>
        <Field label="Traded">{d.trade_date}</Field>
        <Field label="Disclosed">{d.disclosed_date}{d.is_late ? " (late)" : ""}</Field>
        {d.sector_normalized && <Field label="Sector">{d.sector_normalized}</Field>}
      </div>

      {d.triage?.reason && (
        <div>
          <div className="text-xs uppercase tracking-wide text-foreground/45 mb-1">Why this surfaced</div>
          <div className="text-sm text-foreground/80">{d.triage.reason}</div>
        </div>
      )}

      <div className="text-xs text-foreground/45">
        Amounts are disclosed as ranges (STOCK Act). ·{" "}
        <a className="underline underline-offset-2 hover:text-foreground/70" href={d.ptr_link} rel="noreferrer" target="_blank">
          View original filing
        </a>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-foreground/45">{label}</div>
      <div className="text-foreground/85">{children}</div>
    </div>
  );
}

const isGovSignal = (d: MarketDealing<GovDealing>): boolean =>
  d.triageVerdict === "promising" || d.triageVerdict === "maybe";

/* ─── Config ─────────────────────────────────────────────────────────── */

export const CongressMarket: MarketConfig<GovDealing> = {
  id: "usg",
  title: "US Congress (preview)",
  documentTitle: "ddbx · Congressional Trading — US House STOCK Act Filings",
  description: (
    <>
      US House <strong className="text-foreground/75">STOCK Act</strong> Periodic
      Transaction Reports — what members of Congress (and their spouses) are
      buying. Official House Clerk filings, parsed and triaged automatically.{" "}
      <strong className="text-foreground/75">Signal</strong> = trades with a
      committee-jurisdiction edge, a cross-member cluster, or that are notable by
      size/leverage (large bets, options). <strong className="text-foreground/75">All</strong>{" "}
      shows every buy. Senate coming later.
    </>
  ),
  marketLabel: "US Congress",
  locale: "en-US",
  topNotice: "US Congress is an early preview — House only, no manual curation yet.",
  priceFormat: USD_FORMAT,
  normalizeLivePrice: (close_pence) => close_pence / 100,
  // PTRs carry no entry price and disclose weeks late — the position/return
  // machinery doesn't apply, so skip the live-price + benchmark fetches.
  enableLivePrices: false,
  enableLogos: true,
  benchmarkTicker: SPY_TICKER,
  benchmarkLabel: SPY_LABEL,
  formatTickerDisplay: (t) => t,
  views: [{ id: "all", label: "All" }],
  defaultView: "all",
  defaultSignalFilter: "all",
  isSignal: isGovSignal,
  isRowMuted: (d) => d.triageVerdict === "skip",
  isSkipped: (d) => d.triageVerdict === "skip",
  clusterByCompany: true,
  pollIntervalMs: 0,
  async fetchDealings() {
    const r = await api.govDealings({ view: "all", limit: 500 });
    const dealings = r.dealings.map(toMarketDealing);
    const latest = dealings[0]?.disclosedDate;
    return {
      dealings,
      stats: {
        total: dealings.length,
        viewCounts: { all: dealings.length },
        latestDisclosedLabel: latest ? `Latest disclosure ${latest}` : undefined,
      },
    };
  },
  RowActionCell: CongressRowActionCell,
  DetailBody: CongressDetailBody,
  renderEmptyState: () => (
    <>No congressional buys stored yet — the ingest cron fills this every few hours.</>
  ),
};
