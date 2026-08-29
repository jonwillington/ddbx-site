// DjtMarket — the Trump Media (DJT) insider plugin for <MarketPage />.
//
// A single-issuer Form 4 feed (Trump Media & Technology Group, CIK 1849635):
// the board, the officers, and the Trump family. Unlike UsMarket this is the
// RAW insider record — ALL transaction types (grants, sales, tax withholdings,
// open-market buys), no screening, no rating/triage/analysis. It reuses the US
// market's UsDealing plumbing wholesale (grouping, USD formatting, price chart,
// filing-detail drawer) and only overrides the data source + the row chip.
//
// Data: ddbx-data /api/djt-dealings (see
// ddbx-data/investigations/2026-07-10-djt-trump-media-insiders.md).
import type {
  MarketConfig,
  MarketDealing,
  MarketStats,
} from "@/lib/markets/types";

import { api } from "@/lib/api";
import { buildMarketFaq } from "@/lib/markets/faq";
import {
  ActionChip,
  UsDetailBody,
  UsDetailPosition,
  UsMarket,
  groupRows,
  toMarketDealing,
  type UsRowGroup,
} from "@/lib/markets/us";

/* ─── Row chip ───────────────────────────────────────────────────────────
 * The US market shows a rating badge here; DJT has no ratings, so the chip
 * that earns space is the ACTION (buy / sale / grant / withholding) — that's
 * the real signal in a raw insider feed. Structural flags (amendment, late)
 * still surface because they change how a reader should weight the row. */
function DjtRowActionCell({ dealing }: { dealing: MarketDealing<UsRowGroup> }) {
  const row = dealing.raw.primary;

  if (!row) return null;

  return (
    <div className="flex flex-wrap gap-1 justify-center">
      <ActionChip
        label={dealing.actionLabel}
        size="sm"
        tone={dealing.actionTone}
      />
      {row.is_amendment && (
        <ActionChip label="Amendment" size="sm" tone="neutral" />
      )}
      {row.is_late && (
        <ActionChip label="Late filing" size="sm" tone="neutral" />
      )}
    </div>
  );
}

/* ─── MarketConfig ───────────────────────────────────────────────────────── */

export const DjtMarket: MarketConfig<UsRowGroup> = {
  id: "djt",
  title: "Trump Media insiders",
  heroHeadline: "Every Trump Media insider trade.",
  heroSubhead:
    "Every Form 4 a Trump Media & Technology Group (DJT) insider files with the SEC, the board, the officers, and the Trump family, the moment it lands. Grants, sales, and open-market buys, unscreened.",
  faq: buildMarketFaq({
    insiderTerm: "Trump Media insider",
    filingPhrase: "on a Form 4",
    hasApp: true,
  }),
  description: (
    <>
      SEC EDGAR Form 4 filings for{" "}
      <strong className="text-foreground/75">
        Trump Media &amp; Technology Group Corp.
      </strong>{" "}
      (Nasdaq: DJT, issuer CIK 1849635). This is the raw insider record,{" "}
      <strong className="text-foreground/75">every transaction type</strong>:
      stock grants, option exercises, tax-withholding dispositions, sales, and
      open-market purchases, newest disclosure first. Unlike the US Form 4
      surface, nothing is filtered out.
    </>
  ),
  marketLabel: "Trump Media",
  insiderLabel: "Insider",
  locale: "en-US",
  // Reuse the US market's shared plumbing — DJT trades in USD on Nasdaq.
  priceFormat: UsMarket.priceFormat,
  normalizeLivePrice: UsMarket.normalizeLivePrice,
  session: UsMarket.session,
  holidays: UsMarket.holidays,
  benchmarkTicker: UsMarket.benchmarkTicker,
  benchmarkLabel: UsMarket.benchmarkLabel,
  columnHelp: {
    disclosed:
      "Date the Form 4 was filed with the SEC, insiders must file within 2 business days of the trade.",
    ticker: "US exchange ticker symbol (DJT common, DJTWW warrants).",
    company: "The Trump Media insider, officer, director, or 10% owner.",
    value: "Value of the transaction in USD (grants show at $0).",
    trend:
      "Number of legs in this filing, plus the stock's 1-year price trend (trade date marked).",
    performance:
      "Stock return since the trade, or alpha vs the S&P 500 when that view is selected.",
    action: "What kind of transaction this Form 4 reports.",
  },
  // No rating/triage axis — one flat "All" view of the raw feed.
  views: [{ id: "all", label: "All" }],
  defaultView: "all",
  defaultSignalFilter: "all",
  // DJT insiders file in infrequent batches, so "today" is usually empty —
  // the chronological month list reads better without a dominant Today hero.
  hideTodayHero: true,
  // Nothing is "muted" — every transaction type is first-class here.
  isRowMuted: () => false,
  pollIntervalMs: 60_000,
  formatTickerDisplay: (ticker) => ticker,
  fetchNews: () => api.usNews(),
  newsHeading: "US market news",
  newsFooterNote:
    "Third-party headlines (CNBC, MarketWatch, Yahoo Finance, Seeking Alpha); opens in a new tab.",
  async fetchDealings() {
    // Raw all-transaction-types feed for issuer CIK 1849635. 1000 is the
    // server MAX_LIMIT; DJT's whole insider history is well under that.
    const r = await api.djtDealings({ limit: 1000 });
    const groups = groupRows(r.dealings);
    const stats: MarketStats = {
      total: groups.length,
      viewCounts: { all: groups.length },
      latestDisclosedLabel: groups[0]?.primary.disclosed_date
        ? `Latest disclosure ${groups[0].primary.disclosed_date.slice(0, 10)}`
        : undefined,
    };

    return { dealings: groups.map(toMarketDealing), stats };
  },
  RowActionCell: DjtRowActionCell,
  DetailBody: UsDetailBody,
  DetailPosition: UsDetailPosition,
  renderEmptyState: () => (
    <>
      No Trump Media insider filings yet. This page fills as new filings arrive
      from the SEC.
    </>
  ),
};
