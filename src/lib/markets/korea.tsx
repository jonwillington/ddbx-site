// KoreaMarket — the KRX plugin for <MarketPage />.
//
// DECLARATIONS LEAD. Korea is the only market here where the disclosure
// arrives BEFORE the trade: under FSCMA art. 173-3, officers and major
// shareholders must declare a purchase at least 30 days ahead once it reaches
// 1% of the company's shares or 50bn won. Those declarations are the headline
// object (`plans.leads`), and the completed purchases below them are the
// supporting record.
//
// Two things are deliberate and should survive edits:
//
//   1. Declarations render through MarketPlans, not the dealings table. A
//      MarketDealing asserts a trade date, an entry price and a value that
//      were realised; a declaration has none of those. Reusing the row would
//      state things about it that are not true.
//   2. A completed purchase is never promoted for having been pre-declared.
//      The declaration is the event; the filing that confirms it, weeks
//      later, only says a plan already on the record was carried out.
//
// Data: ddbx-data /api/kr-plans and /api/kr-dealings. Korea is data-side only
// there — it is deliberately NOT in MARKETS or MARKET_CONFIG, so neither app
// decoder is involved. See ddbx-data/investigations/2026-08-03-korea-*.md.

import type {
  MarketConfig,
  MarketDealing,
  MarketPlan,
  MarketStats,
  PlansPayload,
} from "@/lib/markets/types";

import { api, type KrDealingWire, type KrPlanWire } from "@/lib/api";
import { buildMarketFaq } from "@/lib/markets/faq";

/** KRX continuous trading, 09:00–15:30 KST. */
export const KRX_SESSION = {
  timeZone: "Asia/Seoul",
  openMinute: 9 * 60,
  closeMinute: 15 * 60 + 30,
};

/** YYYYMMDD as filed → YYYY-MM-DD, which is what the shell expects. */
const iso = (d: string | null): string =>
  d && /^\d{8}$/.test(d)
    ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`
    : (d ?? "");

/** Company names are Hangul in the filing; DART publishes an English name for
 *  every listed issuer and it is joined server-side. Fall back to the Korean
 *  rather than showing nothing — a name is a name. */
const displayName = (en: string | null, ko: string) => en?.trim() || ko;

/* ─── Adapters ───────────────────────────────────────────────────────── */

function toPlan(w: KrPlanWire): MarketPlan {
  return {
    key: w.rcept_no,
    id: w.rcept_no,
    ticker: w.stock_code ?? "",
    company: displayName(w.company_en, w.company),
    insiderName: displayName(w.reporter_name_en, w.reporter_name),
    insiderRole: w.position && w.position !== "-" ? w.position : undefined,
    holderStatus:
      w.major_holder && w.major_holder !== "-" ? w.major_holder : undefined,
    filedDate: iso(w.filed_date),
    windowStart: w.window_start ? iso(w.window_start) : null,
    windowEnd: w.window_end ? iso(w.window_end) : null,
    noticeDays: w.notice_days,
    plannedShares: w.plan_shares,
    plannedValue: w.plan_value_krw,
    plannedPercent: w.plan_pct,
    purposeLabel: w.purpose_reading?.label ?? null,
    purposeHint: w.purpose_reading?.hint ?? null,
    // Only shown when a reading exists — the raw Korean alone would be noise
    // to a reader who cannot parse it.
    purposeRaw: w.purpose_reading ? w.purpose : null,
    isWithdrawn: w.is_withdrawal === 1,
    executedShares: w.executed_shares,
    executedValue: w.executed_value_krw,
  };
}

function toDealing(w: KrDealingWire): MarketDealing<KrDealingWire> {
  return {
    key: w.id,
    id: w.id,
    ticker: w.stock_code ?? "",
    company: displayName(w.company_en, w.company),
    insiderName: displayName(w.reporter_name_en, w.reporter_name),
    insiderRole: w.position && w.position !== "-" ? w.position : undefined,
    disclosedDate: iso(w.disclosed_date),
    // 변동일 is the SETTLEMENT date for on-market trades, not the execution
    // date. It is the closest thing the filing gives to a trade date and is
    // labelled as the trade date throughout the shell; the how-it-works page
    // carries the caveat rather than the row.
    tradeDate: iso(w.trade_date),
    isPurchase: w.shares_change > 0,
    value: w.value_krw,
    entryPrice: w.price_krw,
    shares: Math.abs(w.shares_change),
    raw: w,
  } as MarketDealing<KrDealingWire>;
}

async function fetchPlans(): Promise<PlansPayload> {
  const r = await api.krPlans({ limit: 60 });

  return {
    plans: (r.plans ?? []).map(toPlan),
    notice: r.notice && {
      headline: r.notice.headline,
      body: r.notice.body,
      learnMoreLabel: r.notice.learn_more_label,
      learnMorePath: r.notice.learn_more_path,
    },
  };
}

/** ~£25k at ~1,750 KRW/GBP. Without a floor the feed is unreadable: the median
 *  individual buy is about £15k and a seventh of all filings are treasury-stock
 *  bonuses. Measured in ddbx-data/investigations/2026-08-03-korea-market-probe.md. */
const MIN_KRW = 43_750_000;

async function fetchDealings(): Promise<{
  dealings: MarketDealing<KrDealingWire>[];
  stats: MarketStats;
}> {
  const r = await api.krDealings({ limit: 60, minKrw: MIN_KRW });
  const dealings = (r.dealings ?? []).map(toDealing);

  return {
    dealings,
    stats: {
      total: dealings.length,
      viewCounts: { signal: dealings.length },
      latestDisclosedLabel: dealings[0]?.disclosedDate
        ? `Latest disclosure ${dealings[0].disclosedDate}`
        : undefined,
    },
  };
}

/* ─── Config ─────────────────────────────────────────────────────────── */

/** Korea ships no rating, triage or analysis layer, so a row has no action to
 *  offer beyond what the table already shows. An empty cell keeps the column
 *  geometry identical to the other markets. */
function KrRowActionCell() {
  return null;
}

/** The filing's own record, in the reader's units. Deliberately says nothing
 *  about whether the purchase was pre-declared: the declaration is surfaced
 *  above as its own object, and promoting a completed buy for having been
 *  planned would point at the wrong end of the sequence. */
function KrDetailBody({ dealing }: { dealing: MarketDealing<KrDealingWire> }) {
  const w = dealing.raw;

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
      <DetailPair
        label="Shares"
        value={Math.abs(w.shares_change).toLocaleString("en-GB")}
      />
      <DetailPair
        label="Price paid"
        value={w.price_krw != null ? won.format(w.price_krw) : "—"}
      />
      <DetailPair label="Settled" value={iso(w.trade_date)} />
      <DetailPair label="Disclosed" value={iso(w.disclosed_date)} />
    </dl>
  );
}

function DetailPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11.5px] uppercase tracking-[0.04em] text-foreground/45">
        {label}
      </dt>
      <dd className="mt-0.5 text-foreground/85">{value}</dd>
    </div>
  );
}

const won = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export const KoreaMarket: MarketConfig<KrDealingWire> = {
  id: "kr",
  title: "Korea (preview)",
  marketLabel: "Korea",
  description: (
    <>
      Korean company officers and major shareholders have to declare a share
      purchase <em>before</em> they make it. These are the declarations, newest
      first, with the purchases that followed them below.
    </>
  ),
  locale: "en-GB",
  session: KRX_SESSION,

  priceFormat: {
    formatPrice: (n) => won.format(n),
    formatValue: (n) => won.format(n),
    formatValueCompact: (n) =>
      n >= 1e9
        ? `₩${(n / 1e9).toFixed(1)}bn`
        : n >= 1e6
          ? `₩${(n / 1e6).toFixed(0)}m`
          : won.format(n),
    quoteToValue: 1,
    valueColumnClass: "w-28",
  },
  // Bars are stored as native won, matching SEK. No scaling.
  normalizeLivePrice: (close_pence: number) => close_pence,

  benchmarkTicker: "^KS11",
  benchmarkLabel: "KOSPI",

  RowActionCell: KrRowActionCell,
  DetailBody: KrDetailBody,

  views: [{ id: "signal", label: "Buys" }],
  defaultView: "signal",
  fetchDealings,

  plans: {
    title: "Declared purchases",
    subtitle:
      "Trades Korean insiders have committed to publicly, before making them.",
    leads: true,
    fetchPlans,
    emptyLabel: "No declarations on file yet.",
  },

  faq: buildMarketFaq({
    insiderTerm: "Korean insider",
    filingPhrase: "in a DART disclosure",
    hasApp: false,
  }),
};
