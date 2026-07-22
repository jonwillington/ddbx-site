// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DO NOT EDIT — generated copy of ddbx-data/worker/db/types.ts
//
// The canonical source lives in the ddbx-data repo. To update this file, run
// `npm run sync:types` from a checkout of ddbx-site that has ddbx-data cloned
// alongside it (../ddbx-data). CI runs `npm run check:types` to fail builds
// if this file drifts from the canonical.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


// ============================================================================
// Market registry
// ============================================================================
// Single source of truth for which markets the worker knows about and what
// each one supports. Consumed by GET /api/markets so clients (iOS, ddbx-site)
// can render the right surfaces without hardcoding per-market branches.
//
// Adding a market: append to MARKETS and add a MARKET_CONFIG entry. The
// Record<Market, …> shape makes the new entry a type error until populated.
// EU_MARKETS / MARKET_POLICY further down stay in lockstep when the new
// market is region:"EU" — see the comment on EU_MARKETS below.

export const MARKETS = ["UK", "US", "SE", "NL", "USG"] as const;
export type Market = (typeof MARKETS)[number];

export function isMarket(v: unknown): v is Market {
  return typeof v === "string" && (MARKETS as readonly string[]).includes(v);
}

export interface MarketConfig {
  /** ISO-style market code. Matches the keys of MARKET_CONFIG. */
  code: Market;
  /** Display name. */
  name: string;
  /** Region groups markets that share a wire format and pipeline shape.
   *  "UK" and "US" are one-market regions; "EU" covers all MAR-jurisdiction
   *  members and shares the EuDealing wire format. "GOV" is US government-
   *  insider (congressional STOCK Act) trading — same US equity universe but a
   *  different insider class, its own GovDealing wire format and pipeline. */
  region: "UK" | "US" | "EU" | "GOV";
  /** Primary listing currency (ISO 4217). Note: for UK this is the canonical
   *  product currency; an LSE-listed company can still disclose in EUR/USD —
   *  see the comment block on Dealing.currency below. */
  currency: string;
  /** Which wire format this market's dealings ride on. */
  wireType: "Dealing" | "UsDealing" | "EuDealing" | "GovDealing";
  /** What an insider/director identifier looks like in URLs and detail keys.
   *  - "opaque-hash": UK's `d-{16-char}` synthetic key
   *  - "cik": SEC 10-digit zero-padded reporter CIK
   *  - "normalized-name": lowercase + diacritic-folded reporter name (SE, NL)
   *  - "bioguide": Congress Bioguide ID, the canonical member key (USG)
   *  Lets clients build deep-link URLs and dedupe directors without sniffing. */
  directorIdKind: "opaque-hash" | "cik" | "normalized-name" | "bioguide";
  /** Canonical endpoint paths a client should hit for this market. Resolved
   *  server-side so consumers don't hardcode the current naming asymmetry
   *  (`/api/dealings` vs `/api/us-dealings` vs `/api/eu-dealings?market=…`). */
  endpoints: {
    /** List endpoint. */
    dealings: string;
    /** Detail-by-id endpoint. Undefined when the market has no detail view
     *  (US, EU today — list-only). */
    dealing?: string;
    /** Director / insider detail-by-id endpoint. */
    directorDetail: string;
    /** Per-market news feed. */
    news: string;
  };
  /** Capability flags — which product surfaces this market currently lights
   *  up. Read once at client boot, not hardcoded per surface. Flip a flag
   *  here when the corresponding backend layer ships. */
  capabilities: {
    /** Per-dealing deep analysis (Analysis joined onto rows). */
    analysis: boolean;
    /** Performance / backtest harness — /api/performance equivalent. */
    performance: boolean;
    /** Portfolio surface — /api/portfolio equivalent. */
    portfolio: boolean;
    /** AI-generated morning / afternoon daily summary. */
    dailySummary: boolean;
    /** Macro market-overview banner at the top of the dashboard feed (headline
     *  index open-to-close move + one-line context, on the daily-summary row).
     *  Independent of `dailySummary` so the banner can light up without the full
     *  digest surface (US case). */
    marketOverview: boolean;
    /** Per-market news feed (refreshUk/Us/Se/NlNews + /api/news/*). */
    news: boolean;
    /** Has automated tweet output (daily summaries, weekly movers). */
    tweets: boolean;
    /** Monthly retrospective article + banner (GET /api/monthly-summary). */
    monthlySummary: boolean;
    /** Analyst consensus + price targets on the company surface (the `analyst`
     *  block on CompanyStats — Yahoo financialData + recommendationTrend).
     *  US-first: coverage is strong and clean there; UK is patchy (half the
     *  sample were single-analyst stubs, plus GBp/GBP + USD-ADR currency
     *  pitfalls), so it stays off until the pipeline reconciles those. See
     *  ddbx-ios-app/investigations/2026-06-14-analyst-data-plan.md. */
    analystTargets: boolean;
  };
}

export const MARKET_CONFIG: Record<Market, MarketConfig> = {
  UK: {
    code: "UK",
    name: "United Kingdom",
    region: "UK",
    currency: "GBP",
    wireType: "Dealing",
    directorIdKind: "opaque-hash",
    endpoints: {
      dealings: "/api/dealings",
      dealing: "/api/dealings/:id",
      directorDetail: "/api/directors/:id",
      news: "/api/news/uk",
    },
    capabilities: {
      analysis: true,
      performance: true,
      portfolio: true,
      dailySummary: true,
      marketOverview: true,
      news: true,
      tweets: true,
      monthlySummary: true,
      // On since 2026-06-15: buildAnalystView reconciles UK units (Yahoo serves
      // .L targets in pence mislabelled GBP → divided to pounds to match the
      // de-penced stats; USD-ADR targets like PRU/DGE are dropped, since they
      // can't be reconciled to a GBp price without FX). ~40% of UK issuers carry
      // a reliable block; the rest (incl. the USD-ADR FTSE giants) show the
      // empty state. FX-converting those ADR targets is the next improvement.
      analystTargets: true,
    },
  },
  US: {
    code: "US",
    name: "United States",
    region: "US",
    currency: "USD",
    wireType: "UsDealing",
    directorIdKind: "cik",
    endpoints: {
      // `view=interesting` is the mechanical mask: open-market direct
      // buy, no 10b5-1, non-derivative, value ≥ $50k. Without it the
      // raw US stream is ~7800 Form 4 rows over the 14-day window —
      // mostly grants / option exercises / tax withholdings — which
      // makes the default dashboard unusable. Matches the default
      // ddbx-site's US page picks. Clients can still pass `view=all`
      // explicitly when they want the unfiltered stream.
      dealings: "/api/us-dealings?view=interesting",
      directorDetail: "/api/directors/us/:id",
      news: "/api/news/us",
    },
    capabilities: {
      analysis: true,
      // refreshUsPerformance is on the cron (see pipeline/performance.ts)
      // and us_performance rows backfill horizon returns on each tick.
      // iOS's Performance tab unhides once this flips true.
      performance: true,
      portfolio: false,
      // GO-LIVE SWITCH for the US close-of-day digest. The pipeline (own cron +
      // us_daily_summaries table + /api/daily-summary?market=US) is live and
      // generates+persists regardless, but this flag gates BOTH the in-app
      // surface AND the push fan-out (see runUsDailySummary). Keep false until
      // an iOS build that renders US daily summaries reaches TestFlight, then
      // flip → push + in-app light up together. (Wire shape matches UK; only
      // the cited dealing type differs.)
      dailySummary: false,
      // Macro overview banner ships ahead of the full US digest surface: the
      // numbers are deterministic and the US daily summary is already generated
      // + persisted each close, so the banner can light up while dailySummary
      // (push + full digest screen) stays held.
      marketOverview: true,
      news: true,
      // Live as of 2026-06-11: US X posting (per-trade significant-buy cards,
      // close-of-day daily tweet, Saturday weekly movers) posts as @ddbxus via
      // the TWITTER_US_* OAuth 1.0a secrets. No consumer branches on this flag —
      // it gates the worker's own posting only.
      tweets: true,
      monthlySummary: false,
      // US analyst coverage is strong + clean (spike 2026-06-15: 12/15 with a
      // real consensus). First market to surface the `analyst` block.
      analystTargets: true,
    },
  },
  SE: {
    code: "SE",
    name: "Sweden",
    region: "EU",
    currency: "SEK",
    wireType: "EuDealing",
    directorIdKind: "normalized-name",
    endpoints: {
      dealings: "/api/eu-dealings?market=SE",
      directorDetail: "/api/directors/se/:id",
      news: "/api/news/se",
    },
    capabilities: {
      analysis: true,
      performance: false,
      portfolio: false,
      dailySummary: false,
      marketOverview: false,
      news: true,
      tweets: false,
      monthlySummary: false,
      analystTargets: false,
    },
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    region: "EU",
    currency: "EUR",
    wireType: "EuDealing",
    directorIdKind: "normalized-name",
    endpoints: {
      dealings: "/api/eu-dealings?market=NL",
      directorDetail: "/api/directors/nl/:id",
      news: "/api/news/nl",
    },
    capabilities: {
      analysis: true,
      performance: false,
      portfolio: false,
      dailySummary: false,
      marketOverview: false,
      news: true,
      tweets: false,
      monthlySummary: false,
      analystTargets: false,
    },
  },
  USG: {
    code: "USG",
    name: "US Congress (House)",
    region: "GOV",
    currency: "USD",
    wireType: "GovDealing",
    directorIdKind: "bioguide",
    endpoints: {
      // `view=signal` is the mechanical mask: open-market common-stock
      // purchases that pass the deterministic triage floor (jurisdiction /
      // cluster / size). Without it the raw stream is mostly diversified
      // managed-account baskets and sales — see worker/pipeline/us-gov.
      dealings: "/api/gov-dealings?view=signal",
      directorDetail: "/api/directors/usg/:id",
      news: "/api/news/usg",
    },
    // DARK LAUNCH: every flag false. The pipeline ingests + serves
    // /api/gov-dealings regardless, but no client surfaces it until a
    // dedicated "Congress" surface ships AND the relevant flag flips. Both
    // chambers now ingested — House (Clerk PDFs) + Senate (efdsearch via
    // Firecrawl, past the Akamai wall).
    capabilities: {
      analysis: false,
      performance: false,
      portfolio: false,
      dailySummary: false,
      marketOverview: false,
      news: false,
      // Live 2026-06-11: per-filing significant-buy cards post to @ddbxus
      // (congress rides the US handle). Gated to buys-only + recency-swept so a
      // flip never back-posts the catalogue. Posting code reads this flag.
      tweets: true,
      monthlySummary: false,
      analystTargets: false,
    },
  },
};

export type Rating =
  | "significant"
  | "noteworthy"
  | "minor"
  | "routine";

// ICB top-level industries (FTSE Russell). Used to group dealings by
// industry in the iOS Performance tab. Sourced from Companies House SIC
// 2007 codes via worker/lib/sic-to-icb.ts; LLM fallback emits one of these.
export type SectorNormalized =
  | "Technology"
  | "Telecommunications"
  | "Health Care"
  | "Financials"
  | "Real Estate"
  | "Consumer Discretionary"
  | "Consumer Staples"
  | "Industrials"
  | "Basic Materials"
  | "Energy"
  | "Utilities";

export const SECTOR_NORMALIZED_VALUES: readonly SectorNormalized[] = [
  "Technology",
  "Telecommunications",
  "Health Care",
  "Financials",
  "Real Estate",
  "Consumer Discretionary",
  "Consumer Staples",
  "Industrials",
  "Basic Materials",
  "Energy",
  "Utilities",
] as const;

export function isSectorNormalized(v: unknown): v is SectorNormalized {
  return typeof v === "string" && (SECTOR_NORMALIZED_VALUES as readonly string[]).includes(v);
}

export interface RatingChecklist {
  open_market_buy: boolean;
  senior_insider: boolean;
  meaningful_conviction: boolean;
  no_alternative_explanation: boolean;
  supporting_context_found: boolean;
  no_major_counter_signal: boolean;
}

export type TriageVerdict = "skip" | "maybe" | "promising";

export interface EvidencePoint {
  headline: string;      // short one-liner
  detail: string;        // fuller explanation
  source_label: string;  // citation text
  // Real URL retrieved via web_search. Required at write time for new
  // analyses (enforced in worker/pipeline/analyze.ts), but kept optional on
  // the type so legacy rows + fixtures with no URL still typecheck.
  source_url?: string;
}

export interface Analysis {
  rating: Rating;
  confidence: number;
  summary: string;          // tweet-ready one-liner
  thesis_points: string[];  // 4-6 short paragraphs, each <=2 sentences
  evidence_for: EvidencePoint[];
  evidence_against: EvidencePoint[];
  key_risks: string[];
  catalyst_window: "3m" | "6m" | "12m";
  checklist?: RatingChecklist;
  rating_rationale?: string;
}

export interface DirectorSummary {
  id: string;
  name: string;
  role: string;
  company: string;
  age_band?: string;
  tenure_years?: number;
}

// DealingCurrency is the *disclosure* currency on a UK-pipeline row: an
// LSE-listed company can file its PDMR notification in EUR or USD (notably
// dollar-reporters and overseas ADRs cross-listed in London), in which case
// the worker preserves the raw figure in `price_native` and FX-converts to
// the canonical GBP-pence in `price_pence` / `value_gbp`.
//
// IMPORTANT — not the same axis as `EuDealing.currency`:
// - `Dealing.currency = "EUR"` ⇒ an LSE-listed issuer whose RNS happened to
//   report in EUR. Still a UK-pipeline row, still surfaced via /api/dealings.
// - `EuDealing.currency = "EUR"` ⇒ a Euronext-Amsterdam (or other EU venue)
//   listing under MAR Article 19. Different pipeline, different table,
//   /api/eu-dealings.
// Treat them as distinct concepts even though the string overlaps.
export type DealingCurrency = "GBP" | "EUR" | "USD";

/**
 * Cluster signal — multiple distinct insiders buying the same issuer within a
 * short window. One of the strongest patterns in this dataset (see the triage
 * floors `cluster-PDMR-14d` / `cluster-reporter-14d` and the analyse prompts),
 * surfaced here as a structured, renderable fact so consumers can show a chip
 * rather than the user having to read it out of the analysis prose.
 *
 * Computed at READ time, not persisted — clusters form over days, so a flag
 * frozen at triage time would never light up for the FIRST mover (alone at
 * their own triage moment). The read query therefore uses a SYMMETRIC ±window
 * around the dealing's trade_date (not the look-back-only window the triage
 * engine uses), so every member of a cluster shows the chip, first mover
 * included. Filters mirror the triage engine: open-market buys only, above the
 * per-market value floor, excluding quarantined rows and the dealing's own
 * insider. Only set on `tx_type: "buy"` (UK) / acquisition (US/EU) rows.
 *
 *  - `tier`: "strong" ⇒ a co-buyer within ±14 days; "soft" ⇒ none within 14d
 *    but at least one within ±30 days. Lets consumers weight the chip.
 *  - `count`: distinct insiders in the cluster INCLUDING this dealing's insider
 *    (so the smallest cluster reads `count: 2`).
 *  - `window_days`: 14 for strong, 30 for soft — the window the tier matched.
 *
 * Null/absent when the dealing isn't part of a cluster.
 */
export interface ClusterInfo {
  tier: "strong" | "soft";
  count: number;
  window_days: 14 | 30;
}

/** Buy-style signal: what kind of price action a director was buying into,
 *  computed deterministically from the trailing-`window_days` price series.
 *  `contrarian` = buying into weakness (well off the recent high); `momentum`
 *  = buying into strength (at/near a rising high); `neutral` = no clear trend.
 *  Null/absent when there isn't enough price history to judge, or the row isn't
 *  a confirmed open-market buy. Raw signed numbers are carried alongside the
 *  label so reporting can quote them ("bought 28% off the high") and consumers
 *  can re-tier without a data change. Populated for UK + US only. */
export interface BuyStyle {
  kind: "contrarian" | "momentum" | "neutral";
  /** Signed; ≤ 0. current close ÷ trailing-window max − 1. */
  drawdown_from_high_pct: number;
  /** Signed. current close ÷ window-start close − 1. */
  trailing_return_pct: number;
  window_days: number;
  /** The BUY_STYLE_VERSION the row was tagged under (for audit / retunes). */
  version: number;
}

export interface Dealing {
  id: string;
  trade_date: string;      // ISO
  disclosed_date: string;  // ISO
  created_at?: string;     // ISO datetime UTC — when the row was ingested
  director: DirectorSummary;
  ticker: string;
  company: string;
  tx_type: "buy" | "sell";
  shares: number;
  /** Canonical GBP-equivalent price per share, in pence. FX-converted from
   *  price_native at trade-date rate when currency != "GBP". */
  price_pence: number;
  /** Canonical GBP-equivalent total consideration. */
  value_gbp: number;
  /** Currency of the original RNS. Defaults to "GBP" for legacy rows. */
  currency: DealingCurrency;
  /** Price per share in the native major unit (£, €, $). For GBP rows this
   *  equals price_pence/100; for non-GBP rows this is the raw RNS figure
   *  surfaced for cross-checking against broker confirmations. */
  price_native: number;
  /** Close-of-day price (pence) on `disclosed_date`, or the nearest prior
   *  trading day when disclosure landed on a weekend / holiday. Sourced
   *  from the `prices` table via a read-time subquery — nullable when
   *  we haven't yet cached bars covering the disclosure date. Anchors
   *  the "since disclosure" return on iOS / site (the price a copycat
   *  could realistically have bought into end-of-day). */
  disclosed_close_pence?: number | null;
  /**
   * Set when the row is structurally wrong (price >50× off market after
   * FX + snap). Quarantined rows are hidden from default API responses;
   * /api/dealings?include_quarantined=1 surfaces them for ops/audit.
   * Always undefined on the wire for non-quarantined rows.
   */
  quarantine_reason?: string;
  /**
   * Mechanical classification — set by worker/pipeline/classify-trade.ts by
   * comparing price_pence to the trade-day market close. false ⇒ placing /
   * subscription / option exercise / vesting (price reflects deal terms,
   * not market). null ⇒ no price data yet (innocent until proven guilty).
   */
  is_open_market_buy?: boolean | null;
  triage?: { verdict: TriageVerdict; reason: string };
  analysis?: Analysis;
  performance?: PerformanceRow[];
  /** Server-precomputed live return / alpha as of the latest cached close.
   *  Lets the site render the row badge with no client price fetch. See
   *  LivePerformance. */
  live_performance?: LivePerformance | null;
  sector?: string | null;
  sector_normalized?: SectorNormalized | null;
  sic_codes?: string[] | null;
  /** Cluster signal computed at read time. See ClusterInfo. Null/absent when
   *  this buy isn't part of a same-issuer cluster (or the row is a sell). */
  cluster?: ClusterInfo | null;
  /** Buy-style signal (contrarian / momentum / neutral). See BuyStyle.
   *  Null/absent when unclassified or not a confirmed open-market buy. */
  buy_style?: BuyStyle | null;
}

export interface PerformanceRow {
  horizon_days: 90 | 180 | 365 | 730;
  return_pct: number | null;
  as_of_date: string | null;
}

/** Server-precomputed "as of the latest cached close" performance, attached to
 *  every dealing so consumers render the row's return / alpha badge instantly
 *  from the dealings payload — no per-visitor /api/prices round-trips (which
 *  used to fan out one request per ticker and hit Yahoo on cold cache). Both
 *  anchors are provided so the consumer's trade-vs-disclosure toggle stays
 *  client-side and free:
 *   - `*_trade`     = measured from the execution price (or, for markets with
 *                     no per-share fill price like Congress PTRs, the close on
 *                     the trade date).
 *   - `*_disclosed` = measured from the close on the disclosure date — the
 *                     price a copycat could realistically have entered at.
 *  `alpha_*` is the stock return minus the market benchmark's return over the
 *  same window (FTSE All-Share for UK, S&P 500 for US / Congress). Values are
 *  percentages (e.g. 12.3 = +12.3%); any field is null when the underlying
 *  prices aren't cached yet. `as_of` is the ISO date of the latest close used
 *  — consumers surface it as "Prices as of …". Recomputed every read, so it
 *  tracks the 15-minute price-refresh cron with no extra storage. */
export interface LivePerformance {
  return_pct_trade: number | null;
  return_pct_disclosed: number | null;
  alpha_pct_trade: number | null;
  alpha_pct_disclosed: number | null;
  as_of: string | null;
}

export interface DirectorDetail extends DirectorSummary {
  profile?: {
    biography: string;
    track_record_summary: string;
    flags: string[];
  };
  prior_picks: Dealing[];
  hit_rate_pct: number;
  avg_return_by_horizon: Record<string, number | null>;
}

/** Macro market overview attached to a daily summary. Numbers are the headline
 *  index's intraday open-to-close move (FTSE 100 for UK, S&P 500 for US),
 *  computed deterministically from Yahoo — never the LLM. `narrative` is the
 *  one-line "why", written in the same daily-summary call. Optional on the wire:
 *  absent on thin days / older rows / older clients. */
export interface MarketOverview {
  ticker: string;                // e.g. "^FTSE"
  label: string;                 // e.g. "FTSE 100"
  open: number;                  // index points at the open (or prior close on a gap)
  close: number;                 // index points at the close
  pct: number;                   // open-to-close % move
  narrative: string;             // 1-2 sentence macro context
}

/** Live intraday index quote for the "market open, no deals yet" empty state in
 *  the consumer apps. Unlike `MarketOverview` (a settled open-to-close move with
 *  an LLM "why", written at end of day), this is a pure-numbers snapshot of the
 *  headline index's move SO FAR today: today's open vs the latest traded level,
 *  both from Yahoo. No narrative — the macro "why" stays an end-of-day product.
 *  Served by GET /api/index-quote, gated on the `marketOverview` capability. The
 *  apps only request it while their market is open, and decide whether to show
 *  it; the server returns the freshest intraday figures it can. */
export interface LiveIndexQuote {
  ticker: string;                // e.g. "^FTSE"
  label: string;                 // e.g. "FTSE 100"
  open: number;                  // today's opening level, in index points
  current: number;               // latest traded level, in index points
  pct: number;                   // open-to-current % move
  /** Downsampled intraday close series (chronological, ~40 points) for a
   *  sparkline. Optional: absent on older clients/cache or thin data. */
  series?: number[];
}

/** Close-of-day prose recap, synthesised by Opus from the full tape. */
export interface DailySummary {
  date: string;                  // ISO YYYY-MM-DD
  session: "morning" | "afternoon";
  headline: string;              // push title, ~50 chars
  body: string;                  // prose body, ~150-250 words; may contain markdown bold
  cited_ids: string[];           // dealings.id in narrative order
  total_count: number;           // dealings considered that day
  total_value_gbp: number;       // sum of value_gbp across all considered dealings
  model: string;                 // e.g. "claude-opus-4-6"
  created_at: string;            // ISO datetime UTC
  /** Macro index overview. Optional — omitted when no index data was
   *  available at generation time. */
  market_overview?: MarketOverview;
}

/** Response shape for GET /api/daily-summary — the summary plus the cited
 *  dealings hydrated into full Dealing objects, in cited_ids order. */
export interface DailySummaryResponse {
  summary: DailySummary;
  cited: Dealing[];
}

// ---- Monthly summary -------------------------------------------------------
// A rich retrospective on the previous month's dealings, surfaced as a distinct
// article (a banner at the top of the list is the entry point). Deterministic
// data (selection, metrics, clusters, chart bars) wrapped in a bounded LLM
// narrative layer. One row per (month, market) in `monthly_summaries`
// (migration 029), served by GET /api/monthly-summary. UK-only in v1; the
// `market` field keeps it forward-compatible. All sub-types are intentionally
// flat (string enums, no unions) so they mirror cleanly to Swift Codable and
// Kotlin kotlinx.serialization. See worker/pipeline/monthly-summary.ts.

/** Sentiment marker the article sorts/filters on. Set deterministically from
 *  the item's price move, so the badge can never contradict the number. */
export type MonthlyItemSentiment = "positive" | "negative" | "neutral";

/** Why an item was featured. `spike_faded` is the mid-month-spike-that-reverted
 *  case ("the value has now gone"), only detectable from the price path, not
 *  start-to-end returns. */
export type MonthlyFeatureReason =
  | "best_performer"
  | "worst_performer"
  | "most_interesting"
  | "cluster"
  | "spike_faded";

/** One downsampled price point for a featured item's chart. Mirrors the
 *  /api/prices/history bar shape so consumers reuse their chart renderer.
 *  `price` is always major units (GBP for UK); `close_pence` is the raw stored
 *  scale for parity with the `prices` table. */
export interface MonthlyChartBar {
  date: string;          // ISO YYYY-MM-DD
  price: number;         // major units (e.g. GBP)
  close_pence: number;   // raw stored scale (e.g. pence)
}

/** One ticker's daily-close series inside a Performance price bundle
 *  (GET /api/performance/prices-bundle), columnar to keep the document
 *  compact: `d[i]` pairs with `p[i]`. `p` is always major units of
 *  `currency`; `m` marks tickers whose legacy `close_pence` representation
 *  is minor units (×100 — UK pence / US cents), letting clients rebuild the
 *  legacy value without duplicating the per-market unit table. */
export interface PerfBundleSeries {
  t: string;             // ticker, as keyed in the `prices` cache
  currency: string;      // ISO 4217 code of `p`
  m: boolean;            // legacy close_pence unit is minor (×100)
  d: string[];           // ISO YYYY-MM-DD, ascending
  p: number[];           // daily closes, major units
}

/** Aggregated price document for the iOS Performance tab: every dealing
 *  ticker's series plus the market benchmark in one response, replacing the
 *  per-ticker /api/prices/history fan-out. scope "window" = tickers with a
 *  dealing in the recent rolling window; "all" = every dealing ticker. Both
 *  scopes serve the same `days` bar depth so client caches can mix them. */
export interface PerfPricesBundle {
  asOf: string;                    // ISO timestamp of the build
  market: "UK" | "US";
  scope: "window" | "all";
  days: number;                    // bar depth each series was cut to
  benchmark: PerfBundleSeries | null;  // ^FTAS (UK) / ^GSPC (US)
  series: PerfBundleSeries[];
}

/** A same-issuer cluster surfaced for the month. Rolled up from the read-time
 *  per-dealing `cluster` signal (see ClusterInfo) so the article and the row
 *  chip always agree. Closed-end investment trusts are already excluded by the
 *  shared cluster layer. */
export interface MonthlyCluster {
  ticker: string;
  company: string;
  /** Distinct insiders in the cluster (>= 2). */
  insider_count: number;
  /** Strongest tier seen across the cluster's in-month buys. */
  tier: ClusterInfo["tier"];
  /** Total GBP across the cluster's in-month buys. */
  total_value_gbp: number;
  /** Representative dealing ids in the cluster, for deep-linking. */
  dealing_ids: string[];
  /** Earliest / latest disclosed_date among the cluster's in-month buys. */
  first_buy_date: string;
  last_buy_date: string;
}

/** Month-level deterministic metrics. Never LLM-authored. */
export interface MonthlyMetrics {
  total_dealings: number;        // in-month buys considered (post quarantine + £0 filter)
  total_buys: number;
  total_sells: number;
  total_value_gbp: number;
  distinct_companies: number;
  distinct_directors: number;
  cluster_count: number;
  /** Median since-disclosure return across in-month buys with price data, as a
   *  ratio (0.12 = +12%). Measured disclosure-day close to latest close — for
   *  the just-ended month no 90d horizon has elapsed, so this is the honest
   *  short-window figure, not a settled horizon return. Null when too few. */
  median_return: number | null;
  best_return: number | null;    // best single since-disclosure return, ratio
  worst_return: number | null;   // worst, ratio
  benchmark_return: number | null; // FTSE All-Share over the month, ratio
  /** The month's buys split by buy-style (contrarian / momentum / neutral),
   *  each slice with its own since-disclosure return + alpha medians. Slices
   *  with zero buys are omitted; absent entirely on summaries generated before
   *  the field shipped. */
  style_split?: MonthlyStyleSlice[];
  /** The month's buys grouped by normalised ICB industry, sorted by money
   *  committed. The editorial angle is the divergence: the most-bought sector
   *  and the best-performing sector are often not the same one. Buys with no
   *  sector are omitted; absent on summaries generated before the field
   *  shipped. */
  sector_table?: MonthlySectorSlice[];
}

/** One buy-style's slice of the month: how many buys, how much money, and how
 *  the style performed (median since-disclosure return, and median alpha vs
 *  the benchmark over each buy's own disclosure→as-of window). Return fields
 *  are null when no buy in the slice has usable price data. */
export interface MonthlyStyleSlice {
  style: "contrarian" | "momentum" | "neutral";
  buy_count: number;
  total_value_gbp: number;
  median_return: number | null;
  median_alpha: number | null;
}

/** One industry's slice of the month — same stats as MonthlyStyleSlice but
 *  grouped by the normalised ICB sector. */
export interface MonthlySectorSlice {
  sector: SectorNormalized;
  buy_count: number;
  total_value_gbp: number;
  median_return: number | null;
  median_alpha: number | null;
}

/** Path-aware summary of an item's post-disclosure move, computed by scanning
 *  the daily `prices` series (not just endpoints). This is what makes a
 *  mid-month spike that has since faded a detectable, first-class shape. All
 *  returns are ratios from the disclosure-day close (the realistic copycat
 *  entry); null when the price series is too thin. */
export interface MonthlyPriceArc {
  peak_return: number | null;     // max close/entry - 1 over the window
  peak_date: string | null;
  trough_return: number | null;   // min close/entry - 1
  trough_date: string | null;
  current_return: number | null;  // latest/entry - 1
  give_back: number | null;       // peak_return - current_return (how much faded)
  max_drawdown_from_peak: number | null;
}

/** One featured retrospective item. The deterministic fields are filled by the
 *  selector; the *_text fields and `sources` are the per-item LLM (Opus +
 *  web_search) narrative. `sentiment` and `feature_reason` are deterministic. */
export interface MonthlyFeaturedItem {
  dealing_id: string;
  ticker: string;
  company: string;
  director_name: string;
  director_role: string | null;
  disclosed_date: string;
  entry_price_pence: number | null;   // disclosed-day close (copycat entry)
  latest_price_pence: number | null;  // latest cached close at generation time
  return_since_entry: number | null;  // latest/entry - 1, ratio
  arc: MonthlyPriceArc;
  sentiment: MonthlyItemSentiment;
  feature_reason: MonthlyFeatureReason;
  /** Cluster signal for this buy, when part of one. Mirrors Dealing.cluster. */
  cluster?: ClusterInfo | null;
  /** Buy-style kind at disclosure (contrarian / momentum / neutral). Mirrors
   *  Dealing.buy_style.kind; null when the classifier had no honest answer. */
  buy_style?: BuyStyle["kind"] | null;
  /** Downsampled price bars over the featured window. */
  chart: MonthlyChartBar[];
  // --- LLM narrative (Opus + web_search) ---
  headline_text: string;          // one-line "what happened"
  retrospective_text: string;     // balanced "has the value gone"
  forward_view_text: string;      // impartial "is there still a case", never advice
  sources?: string[];             // source URLs retrieved at synthesis time
}

/** One of the previous review's featured picks, re-marked a month later. The
 *  publication-time fields are copied verbatim from the stored item, so the
 *  grade is against exactly what was published. */
export interface MonthlyReportCardItem {
  dealing_id: string;
  ticker: string;
  company: string;
  feature_reason: MonthlyFeatureReason;
  entry_price_pence: number | null;   // disclosure-day close, as published
  return_at_publication: number | null; // return_since_entry when featured
  return_now: number | null;          // entry -> latest close at grading time
}

/** "How did last month's calls do" — the previous summary's featured picks
 *  re-marked at this summary's generation date. Wins build credibility,
 *  owning the losers builds more. Null/absent when there is no prior summary
 *  to grade (or it predates the field). */
export interface MonthlyReportCard {
  graded_month: string;           // ISO "YYYY-MM" of the summary being graded
  as_of: string;                  // ISO date the return_now marks were taken
  items: MonthlyReportCardItem[];
  hits: number;                   // items with return_now > 0
  misses: number;                 // items with return_now < 0
}

/** Top-level monthly retrospective. Persisted to `monthly_summaries`; served by
 *  GET /api/monthly-summary. Market-aware; UK only in v1. */
export interface MonthlySummary {
  month: string;                  // featured month, ISO "YYYY-MM" (the previous month)
  market: Market;
  headline: string;               // banner title (~60 chars)
  intro: string;                  // 2-4 sentence month overview
  macro_note: string;             // macro framing for the month
  metrics: MonthlyMetrics;
  featured: MonthlyFeaturedItem[];
  clusters: MonthlyCluster[];
  benchmark_chart: MonthlyChartBar[]; // FTSE All-Share over the month
  /** Last month's featured picks re-graded at generation time. */
  report_card?: MonthlyReportCard | null;
  model: string;                  // primary synthesis model id
  created_at: string;             // ISO datetime UTC
}

/** Strategy universes the monthly performance chart can switch between.
 *  `every_buy` is the broad series; the rating-based universes narrow to the
 *  analysis signal; the style universes narrow to the buy-style classifier
 *  (contrarian = bought into a drawdown, momentum = bought into strength). */
export type MonthlyPerfUniverse =
  | "every_buy"
  | "significant"
  | "noteworthy"
  | "contrarian"
  | "momentum";

/** One universe's read-time alpha series for the month: equal-weight £100/buy,
 *  entered on each buy's disclosure-day close and marked to the latest close,
 *  against the same stakes put into the FTSE All-Share. `alpha` is the final
 *  strategy return minus the benchmark return — the ranking key for the default
 *  series. */
export interface MonthlyPerfSeries {
  universe: MonthlyPerfUniverse;
  label: string;                // "Every buy" | "Significant" | "Noteworthy"
  buy_count: number;            // legs contributing to this series
  strategy: PortfolioPoint[];   // picks portfolio value over the month, £ major
  benchmark: PortfolioPoint[];  // same stakes into FTSE All-Share, £ major
  deployed: PortfolioPoint[];   // cumulative capital deployed, £ major
  final_return: number;         // strategy return at as-of, ratio
  benchmark_return: number;     // same stakes in FTSE, ratio
  alpha: number;                // final_return - benchmark_return
}

/** Read-time alpha for the month, one series per strategy universe. Only
 *  universes with a computable (>= 2 point) series are included; `default_universe`
 *  is the highest-alpha one ("best return vs FTSE"). Computed on the fly in
 *  GET /api/monthly-summary (not persisted — deterministic, no LLM). Null when
 *  too few buys have price data, or for markets without the monthly benchmark. */
export interface MonthlyPerformance {
  series: MonthlyPerfSeries[];
  default_universe: MonthlyPerfUniverse;
}

/** Response shape for GET /api/monthly-summary — the summary plus the featured
 *  and cluster dealings hydrated into full Dealing objects for deep-linking,
 *  plus the read-time `performance` alpha series (null when unavailable). */
export interface MonthlySummaryResponse {
  summary: MonthlySummary;
  cited: Dealing[];
  performance: MonthlyPerformance | null;
}

/** Lightweight index entry for GET /api/monthly-summaries — enough to render a
 *  list of available retrospectives without fetching each full article. */
export interface MonthlySummaryListItem {
  month: string;      // ISO "YYYY-MM"
  market: Market;
  headline: string;
  created_at: string; // ISO datetime UTC
}

/** Response shape for GET /api/monthly-summaries — available retrospectives for
 *  a market, newest first. */
export interface MonthlySummariesResponse {
  summaries: MonthlySummaryListItem[];
}

export interface PortfolioPoint {
  date: string;
  value_gbp: number;
}

export interface PortfolioPick {
  dealing_id: string;
  ticker: string;
  company: string;
  trade_date: string;
  rating: Rating;
  entry_price_pence: number;
  current_price_pence: number | null;
  return_pct: number;
  contribution_gbp: number; // current £value − £100 stake
  ftse_return_pct: number;  // FTSE All-Share return over the same trade_date → as_of window
  alpha_pp: number;         // (return_pct − ftse_return_pct) × 100, percentage points
}

export interface FinancialYear {
  fy: number;        // 26 means FY26 (starts 6 Apr 2026)
  start: string;     // ISO date
  end: string;       // ISO date (inclusive)
  in_progress: boolean;
  picks_count: number;
}

export interface CompanyProfile {
  description: string;
  sector: string;
  sector_normalized?: SectorNormalized | null;
  sic_codes?: string[] | null;
  website?: string;
  key_facts: string[];
}

export interface Ticker {
  ticker: string;
  company_name: string | null;
  exchange: string;
  first_seen_at: string;
  last_seen_at: string;
  sector?: string | null;
  sector_normalized?: SectorNormalized | null;
  sic_codes?: string[] | null;
  description?: string | null;
  website?: string | null;
  profile?: CompanyProfile;
  profile_updated_at?: string | null;
}

export interface LatestPrice {
  ticker: string;
  price_pence: number;
  date: string;
}

/** UK markets headline from aggregated RSS (outbound links only). */
export interface UkNewsItem {
  title: string;
  url: string;
  source: string;
  published_at: string | null;
}

export interface Portfolio {
  fy: number;                  // 26 means FY26
  fy_start: string;            // ISO, e.g. "2026-04-06"
  fy_end: string;              // ISO, e.g. "2027-04-05"
  as_of: string;               // ISO of the latest curve point
  in_progress: boolean;        // FY hasn't ended yet
  picks_curve: PortfolioPoint[];
  ftse_curve: PortfolioPoint[];
  picks_return_pct: number;    // 0.123 = +12.3%
  ftse_return_pct: number;
  alpha_pp: number;            // (picks − ftse) × 100, in percentage points
  picks_count: number;
  starting_value_gbp: number;  // picks_count × £100
  picks: PortfolioPick[];
  available_fys: FinancialYear[];
}

// ============================================================================
// US wire format — see investigations/multi-market/form4-mapping.md
// ============================================================================
// Per the form4-mapping spike, Form 4 is structurally larger than the UK
// `Dealing` shape — we keep a parallel `UsDealing` row format rather than
// generalising. Field names mirror Form 4's XML element names where reasonable
// so the parser stays auditable against the SEC schema (X0609).

/** SEC Form 4 transaction codes. The full set is documented at
 *  https://www.sec.gov/about/forms/form4.pdf — we carry the raw code so the
 *  iOS adapter can decide how to surface it (open-market buy/sale, grant,
 *  exercise, gift, other). */
export type UsTransactionCode =
  | "P"  // Open market or private purchase
  | "S"  // Open market or private sale
  | "A"  // Grant/award (issuer to insider, free)
  | "M"  // Exercise/conversion of derivative
  | "F"  // Payment of exercise price or tax via shares
  | "G"  // Gift
  | "C"  // Conversion of derivative
  | "D"  // Disposition pursuant to tender / Rule 16b-3
  | "J"  // Other (footnote required)
  | "V"  // Voluntary reported earlier
  | "K"  // Equity swap
  | "X"  // Exercise of in/at-the-money derivative
  | "U"  // Disposition pursuant to tender
  | "W"  // Will or laws of descent
  | "Z"  // Voting trust
  | "L"  // Small transaction
  | "H"  // Expiration
  | "I"  // Discretionary plan
  | "E"; // Expiration of short position

export interface UsReporter {
  /** SEC CIK, 10-digit zero-padded. Stable across filings — the right
   *  primary key for an insider, much better than the free-form RNS name. */
  cik: string;
  name: string;
  /** Multi-checkbox roles. A reporter can be both a director and officer; this
   *  is a flattened list rather than the single string `Dealing.director.role`. */
  roles: Array<"director" | "officer" | "ten_percent_owner" | "other">;
  officer_title?: string;
  other_text?: string;
}

export interface UsDealing {
  /** Deterministic id: `f4-{accession_with_dashes}-{table}-{row}`. */
  id: string;
  /** EDGAR accession number with dashes (e.g. `0001213900-26-056175`). Groups
   *  N transactions emitted by the same Form 4 — same-day multi-leg
   *  disclosures (M then S) share a filing_id. */
  filing_id: string;
  /** Form 4 `periodOfReport` / `transactionDate`. */
  trade_date: string;          // ISO
  /** EDGAR file_date from the index. */
  disclosed_date: string;      // ISO
  created_at?: string;         // ISO datetime UTC — when ingested

  /** Primary reporter, picked per parser rules (prefer named individuals
   *  over fund entities; first listed when ambiguous). */
  reporter: UsReporter;
  /** Joint filers other than `reporter`, if any. The same transaction can be
   *  reported by multiple persons (e.g. fund GP + attributed individual). */
  co_reporters?: UsReporter[];

  /** Form 4 `issuerCik`. Stable company key; ticker can change on M&A. */
  issuer_cik: string;
  company: string;             // issuerName
  ticker: string;              // issuerTradingSymbol (no exchange suffix on US tickers)
  /** Always "USD" today; field kept for symmetry with `Dealing.currency`. */
  currency: "USD";

  /** Raw `securityTitle` text. Distinguishes Class A vs Class B for dual-class
   *  filers (e.g. NPWR). */
  security_title: string;
  /** Form 4's `transactionCode` — surfaced verbatim so triage and the iOS
   *  adapter can categorise. Don't collapse to `buy|sell`. */
  transaction_code: UsTransactionCode;
  /** Acquired (A) vs disposed (D). Orthogonal to `transaction_code` — a J
   *  ("other") row can be either. */
  acquired_disposed: "A" | "D";
  shares: number;
  /** Decimal USD majors. `null` when the filing footnotes the price
   *  (common for distributions and complex transactions). `0` for grants. */
  price: number | null;
  /** shares × price. `null` when price is `null`. */
  value: number | null;
  /** Close-of-day price (USD majors) on `disclosed_date`, or nearest prior
   *  trading day. Sourced from the cached `prices` table at read time —
   *  nullable when bars aren't cached for the disclosure window. Anchors
   *  the "since disclosure" return on iOS / site so the metric is what a
   *  copycat trader could have actually entered at, not the insider's
   *  trade-day fill. */
  disclosed_close?: number | null;
  /** Server-precomputed live return / alpha as of the latest cached close.
   *  See LivePerformance. For tranche-split filings this is per-leg; the site
   *  reads it off the group's primary leg. */
  live_performance?: LivePerformance | null;
  /** Post-transaction holding. Lets the product answer "did they sell out
   *  entirely?" — a stronger signal than just the transaction size. */
  shares_after?: number;
  /** Direct (D) or indirect (I) beneficial ownership. */
  direct_indirect: "D" | "I";
  /** Free-text nature when indirect (e.g. "By: NPEH, LLC"). */
  nature_of_ownership?: string;

  /** The Rule 10b5-1 plan affirmation. A `true` here means the trade ran on
   *  a pre-arranged plan — approximately zero current-view signal. The single
   *  most important quality flag in US insider data. */
  aff_10b5_one: boolean;
  /** Voluntary filer who's not formally a Section 16 reporter. Edge case. */
  not_subject_to_section16?: boolean;
  /** Form 4 `transactionTimeliness = "L"` — filed late (past T+2). Itself a
   *  governance signal. */
  is_late?: boolean;

  /** Set when the row comes from Table II (derivative table). */
  is_derivative: boolean;
  /** For derivative rows only — title of the security the derivative converts
   *  into (e.g. "Class A Common Stock" for an option on common stock). */
  underlying_security_title?: string;
  underlying_security_shares?: number;
  conversion_or_exercise_price?: number | null;
  exercise_date?: string | null;
  expiration_date?: string | null;

  /** True when documentType is `4/A`. Restate policy TBD — current default is
   *  to surface alongside the original with the badge. */
  is_amendment: boolean;
  /** Form 4 `dateOfOriginalSubmission`, present on amendments only. */
  original_filing_date?: string;

  /** Set by `worker/pipeline/us/classify-trade.ts` after ingest. `true` means
   *  the trade looks replicable by a retail copycat (open-market fill at a
   *  liquid issuer); `false` means it isn't (penny stock, non-exchange
   *  issuer, placement-priced fill, or a data-quality outlier); `null` /
   *  `undefined` means unclassified — surfaced normally until the next
   *  classifier pass. User-facing query paths in `worker/db/us-queries.ts`
   *  hide rows where this is `false`. Mirrors UK `Dealing.is_open_market_buy`
   *  semantically, but the underlying rules differ (US uses penny-stock
   *  floor + ticker-absence + tighter divergence). */
  is_open_market_buy?: boolean | null;

  /** Footnote map. Many Form 4 fields carry a `<footnoteId>` reference
   *  instead of an inline value — the footnote text is often the substance. */
  footnotes?: Record<string, string>;

  /** Haiku triage verdict for the parent filing+code group. Joined in by
   *  the read API — not part of the raw Form 4 payload. Same nested shape as
   *  `Dealing.triage` / `EuDealing.triage` so clients have one consistent
   *  way to read triage across markets. */
  triage?: { verdict: UsTriageVerdict; reason: string };

  /** Deep analysis result for the parent filing+code+reporter group, when
   *  one exists. Joined in by the read API from us_analyses; absent (or null)
   *  when the group hasn't been enriched yet. The same Analysis shape UK
   *  dealings carry, so the same renderers apply on the frontend. */
  analysis?: Analysis | null;

  /** Free-form industry — SEC's `sicDescription` for the issuer's CIK (e.g.
   *  "Pharmaceutical Preparations"). Joined in by the read API from the
   *  `us_issuers` enrichment table; absent until the issuer's been enriched.
   *  Mirrors `Dealing.sector`. */
  sector?: string | null;
  /** Normalised ICB top-level industry — one of the 11 `SectorNormalized`
   *  values, derived from the SEC SIC code via worker/pipeline/us-sic-to-icb.ts
   *  (LLM fallback for sentinel/ambiguous codes). Joined in from `us_issuers`.
   *  Lets US issuers group alongside UK ones in the consumers' "Industry"
   *  surfaces. Mirrors `Dealing.sector_normalized`. */
  sector_normalized?: SectorNormalized | null;

  /** Cluster signal computed at read time — distinct other reporters acquiring
   *  the same issuer within ±14d (strong) / ±30d (soft). See ClusterInfo.
   *  Null/absent when not part of a cluster, or the row isn't an acquisition.
   *  Mirrors `Dealing.cluster`. */
  cluster?: ClusterInfo | null;
  /** Buy-style signal (contrarian / momentum / neutral). See BuyStyle.
   *  Mirrors `Dealing.buy_style`. */
  buy_style?: BuyStyle | null;
}

export type UsTriageVerdict = "skip" | "maybe" | "promising";

/** Composite key for one logical Form 4 trade — matches the triple
 *  getUsDealingsGrouped collapses tranche rows on. The right granularity for
 *  both triage and analysis: joint-filer disclosures stay separate, multi-leg
 *  purchases at different prices collapse into one decision. */
export interface UsAnalysisKey {
  filing_id: string;
  transaction_code: string;
  reporter_cik: string;
}

/** Response shape for GET /api/directors/us/:id. Mirrors DirectorDetail
 *  field-by-field except prior_picks is typed against UsDealing so the
 *  wire format stays parallel rather than translated. age_band /
 *  tenure_years / profile are present on the type for shape-parity with
 *  DirectorDetail but always undefined in v1 — bio + tenure data lands in
 *  a follow-up. The :id is a reporter_cik. Horizon aggregates can be null
 *  while US data depth is shallow — frontend renders "—". */
export interface UsDirectorDetail {
  /** reporter_cik, zero-padded 10-digit. */
  id: string;
  name: string;
  /** Most recent role across this person's filings — flattened from the
   *  multi-checkbox UsReporter.roles. Falls back to "Insider" when empty. */
  role: string;
  /** Most recent issuer this person filed for. */
  company: string;
  age_band?: string;
  tenure_years?: number;
  profile?: {
    biography: string;
    track_record_summary: string;
    flags: string[];
  };
  prior_picks: UsDealing[];
  /** Fraction of resolved prior picks with a positive longest-horizon return,
   *  expressed as a percentage. 0 when no horizons have resolved. */
  hit_rate_pct: number;
  /** Average return at each horizon across resolved prior picks. Each value
   *  is null while that horizon has not resolved for any pick (the common
   *  case during the first 3 months of US coverage). Keyed "3m" | "6m" |
   *  "12m" | "24m" to match the UK shape. */
  avg_return_by_horizon: Record<string, number | null>;
}

// ============================================================================
// EU wire format — MAR Article 19 PDMR transactions
// ============================================================================
// Pan-EU spike. v1 source is Sweden's Finansinspektionen (FI) "Insynsregister"
// CSV export — the only NCA with a clean machine-readable feed of full Article
// 19 fields (LEI, ISIN, price, volume, MIC). NL/DE/FR added later via per-market
// modules; the wire format is designed to fit all of them since MAR mandates
// a harmonised notification template (Commission Implementing Regulation
// 2016/523, Annex).
//
// Field names use the MAR/MiFID English vocabulary (LEI, ISIN, MIC, PDMR) so
// the parser stays auditable against the underlying regulation rather than the
// per-country localisation of the CSV.

/** Source market. ISO 3166-1 alpha-2. Single source today; expected to grow
 *  as more NCAs come online. Runtime constant is the source of truth so
 *  validators stay in lockstep with the type — add a new market by appending
 *  to EU_MARKETS and the union widens automatically. */
export const EU_MARKETS = ["SE", "NL"] as const;
export type EuMarket = (typeof EU_MARKETS)[number];

export function isEuMarket(v: unknown): v is EuMarket {
  return (
    typeof v === "string" &&
    (EU_MARKETS as readonly string[]).includes(v)
  );
}

export interface EuReporter {
  /** Free-form person name (PDMR — "Person discharging managerial
   *  responsibilities", the EU's equivalent of an SEC "insider"). MAR has no
   *  cross-border stable identifier for individuals, so this is the join key
   *  for now. Cross-filing continuity is best-effort by exact name match. */
  name: string;
  /** Localised role text (FI: "Styrelseledamot" = board member, "VD" = CEO,
   *  "Annan ledande befattningshavare" = other senior officer). Carried
   *  verbatim; the iOS adapter maps to a product-level enum. */
  role: string;
  /** True when the filing is by a PCA ("Person closely associated" — family
   *  member or controlled entity) on behalf of the PDMR. Distinguishes a
   *  spouse's purchase from the director's own purchase, which matters for
   *  conviction signal. */
  is_closely_associated: boolean;
  /** The reporting entity (FI: Anmälningsskyldig). When the PDMR reports for
   *  themselves this equals `name`; for a PCA filing it's the PCA's legal
   *  name. Surfaced verbatim for indirect-ownership chain visibility. */
  filing_entity?: string;
}

/** MAR's nature-of-transaction enumerations are localised by each NCA but
 *  derive from the same Annex template. Carry the raw localised string and
 *  normalise at the edge.
 *
 *  FI strings seen so far: "Förvärv" (acquisition), "Avyttring" (disposal),
 *  "Tilldelning" (allotment/grant), "Pantsättning" (pledge), "Lån" (lending).
 *  Direction (acquisition vs disposal) is implicit in the string. */
export type EuTransactionNature = string;

export interface EuDealing {
  /** Deterministic id: `mar-{market}-{publication_ts}-{hash}` where hash is
   *  a short digest of (issuer LEI, reporter name, isin, trade_date, volume,
   *  price). FI CSV has no native row ID so we synthesise one. */
  id: string;
  /** Source market. */
  market: EuMarket;

  /** Transaktionsdatum — when the trade happened. Date-only; FI publishes
   *  timestamps but the time component is always 00:00:00. */
  trade_date: string;          // ISO
  /** Publiceringsdatum — when the NCA published the notification. Closest
   *  EU equivalent of EDGAR's file_date. Includes time of day. */
  disclosed_date: string;      // ISO datetime
  created_at?: string;         // ISO datetime UTC — when ingested

  /** PDMR or PCA who filed. */
  reporter: EuReporter;

  /** Issuer name (FI: Emittent). Legal entity name; not the trading name. */
  company: string;
  /** Legal Entity Identifier — the MAR-mandated cross-border issuer key.
   *  20 chars, ISO 17442. Stable across renames, M&A, and ticker changes.
   *  Use this as the canonical issuer ID, not `company` or `ticker`. */
  lei: string;
  /** ISIN — 12-char ISO 6166 security identifier. The cross-border security
   *  key under MAR; tickers vary by venue (`.ST`, `.AS`, etc.) but ISIN is
   *  unique. */
  isin: string;

  /** Free-text instrument name (FI: Instrumentnamn). Sometimes a share class
   *  ("XYZ AB ser. B"), sometimes a derivative description. */
  instrument_name: string;
  /** Instrument type (FI: Instrumenttyp). "Aktie" = share, "Option" = option,
   *  "Obligation" = bond, "Warrant" = warrant. Surfaced verbatim; the iOS
   *  adapter decides whether to display. */
  instrument_type: string;

  /** Nature of transaction (FI: Karaktär). Localised. See EuTransactionNature. */
  nature: EuTransactionNature;
  /** Volume of the transaction. Unit is `volume_unit` — usually "Antal" (count
   *  of shares) but can be a nominal value for bonds. */
  volume: number;
  /** Unit of volume (FI: Volymsenhet). Usually "Antal" = share count. */
  volume_unit: string;
  /** Price per unit. `null` for grants and some derivative transactions where
   *  no consideration applies. */
  price: number | null;
  /** Currency of `price`. Sweden mostly SEK with some EUR for cross-listed
   *  issuers; other NCAs will be mostly EUR. */
  currency: string;
  /** MIC (Market Identifier Code, ISO 10383) where the trade executed. FI
   *  publishes the venue name verbatim ("NASDAQ STOCKHOLM AB",
   *  "Utanför handelsplats" = "Outside trading venue"); we map to MIC code
   *  where possible and fall back to the raw string. */
  venue?: string;

  /** True when the notification is a correction of an earlier filing
   *  (FI: Korrigering = "Ja"). Analogue of Form 4/A. */
  is_amendment: boolean;
  /** Free-text reason for the correction (FI: Beskrivning av korrigering).
   *  Often "Felaktigt pris" (wrong price), "Felaktigt antal" (wrong count). */
  amendment_reason?: string;
  /** True when the filing is the PDMR's first-time notification with this
   *  issuer (FI: Är förstagångsrapportering). MAR-specific concept. */
  is_first_time_report: boolean;
  /** True when the transaction is linked to a share/option programme
   *  (FI: Är kopplad till aktieprogram). Analogue of US transaction codes
   *  A/M/F — programme-driven trades are weaker conviction signals. */
  is_share_programme: boolean;
  /** FI: Status. "Aktuell" = current/active; rows can be retracted. */
  status: string;

  /** Canonical display symbol resolved from `isin` via the per-market
   *  lookup in `worker/pipeline/eu/isin-tickers.ts` — UI only, no exchange
   *  suffix. Populated at read time by `getEuDealings`, so consumers that
   *  go through `raw_json` directly won't see it. Optional — names not in
   *  the lookup keep falling back to the ISIN until the map is extended.
   *  The vendor-specific Yahoo symbol is deliberately not exposed on the
   *  wire; it lives in the lookup module and is used only by server-side
   *  price-fetching code. */
  ticker?: string;

  /** Haiku triage verdict, attached at read time when the eu_triage row
   *  exists. Same {skip,maybe,promising} shape as the UK and US layers.
   *  Optional — null/absent on rows we haven't triaged yet. */
  triage?: { verdict: EuTriageVerdict; reason: string };

  /** Opus deep analysis, attached at read time when the eu_analyses row
   *  exists. Same Analysis payload as the UK (`Dealing.analysis`) and US
   *  (`UsDealing.analysis`) layers. Absent on rows that triaged below the
   *  analyse threshold or haven't been analysed yet. Clients gate on
   *  MARKET_CONFIG[market].capabilities.analysis before surfacing it. */
  analysis?: Analysis;

  /** Cluster signal computed at read time — distinct other PDMRs acquiring the
   *  same issuer (by LEI) within ±14d (strong) / ±30d (soft). See ClusterInfo.
   *  Null/absent when not part of a cluster, or the row isn't an acquisition.
   *  Mirrors `Dealing.cluster`. */
  cluster?: ClusterInfo | null;
}

export type EuTriageVerdict = "skip" | "maybe" | "promising";

/** Response shape for GET /api/directors/se/:id. Same field set as
 *  DirectorDetail/UsDirectorDetail; prior_picks is typed against EuDealing.
 *  Person identity is by normalised reporter.name (lowercase + diacritic
 *  fold + whitespace collapse) — FI publishes no stable cross-border
 *  identifier for individuals. The :id is that normalised key; the API
 *  also accepts any spelling/case/diacritic variant in the URL since both
 *  sides go through the same normaliser. age_band / tenure_years / profile
 *  exist for shape-parity with the UK type but are always undefined in v1;
 *  Swedish public-figure coverage is too thin for a Haiku bio pass to be
 *  worth running. */
export interface EuDirectorDetail {
  /** Normalised key (URL-safe). */
  id: string;
  /** Best display form — the original reporter_name on the most recent
   *  matching filing. Preserves Swedish diacritics for display. */
  name: string;
  /** Most recent localised reporter.role across this person's filings
   *  (FI strings: "Styrelseledamot", "VD", etc.). */
  role: string;
  /** Most recent issuer this person filed for. */
  company: string;
  market: EuMarket;
  age_band?: string;
  tenure_years?: number;
  profile?: {
    biography: string;
    track_record_summary: string;
    flags: string[];
  };
  prior_picks: EuDealing[];
  /** Fraction of resolved prior picks with a positive longest-horizon return,
   *  expressed as a percentage. 0 when no horizons have resolved (the case
   *  during the first 3 months of SE coverage). */
  hit_rate_pct: number;
  /** Average return at each horizon across resolved prior picks. Null when
   *  the horizon has not resolved for any pick. Keyed "3m" | "6m" | "12m" |
   *  "24m" to match UK/US. */
  avg_return_by_horizon: Record<string, number | null>;
}

/** One logical Form 4 trade after collapsing tranche-split rows. Same shape
 *  the triage runner sees and the iOS / web clients can render as a single
 *  card instead of N near-duplicate ones. Grouped by
 *  (filing_id, transaction_code, reporter_cik) — co-reporter filings stay
 *  separate even when they share a filing_id. */
export interface UsDealingGroup {
  filing_id: string;
  transaction_code: UsTransactionCode;
  reporter_cik: string;
  reporter_name: string;
  /** Reporter relationship checkboxes from Form 4 (parsed in
   *  worker/pipeline/us/parse.ts:208-212). Hydrated via
   *  json_extract on us_dealings.raw_json so triage doesn't have to
   *  re-fetch the row. Empty array if the field is absent or the
   *  reporter is a non-individual entity. */
  roles: Array<"director" | "officer" | "ten_percent_owner" | "other">;
  /** Free-text officer title from Form 4 reporter relationship
   *  ("Chief Executive Officer", "President and CFO", etc). Null when
   *  the reporter is not an officer or the title was not disclosed. */
  officer_title: string | null;
  issuer_cik: string;
  ticker: string;
  company: string;
  trade_date: string;
  disclosed_date: string;
  security_title: string;
  /** Sum of all leg shares. */
  shares: number;
  /** Volume-weighted average price across legs, or `null` if every leg was
   *  footnote-priced. */
  price: number | null;
  /** Sum of all leg `value` fields, treating null as 0. */
  value: number;
  acquired_disposed: "A" | "D";
  direct_indirect: "D" | "I";
  aff_10b5_one: boolean;
  is_derivative: boolean;
  is_amendment: boolean;
  is_late: boolean | null;
  /** Number of underlying us_dealings rows that collapsed into this group. */
  leg_count: number;
  /** Disclosed-day close (USD majors), same semantics as `UsDealing.disclosed_close`.
   *  All legs of a group share (ticker, disclosed_date) so the per-leg subquery
   *  collapses cleanly under aggregation. Null when prices aren't cached yet. */
  disclosed_close?: number | null;
  triage_verdict?: UsTriageVerdict;
  triage_reason?: string;
  /** Return at each horizon since the group's trade_date, computed off
   *  the group's volume-weighted average entry price. Absent / empty
   *  when no horizon has elapsed yet. Same shape as Dealing.performance
   *  (currency-agnostic ratio). Surfaces only once
   *  MARKET_CONFIG.US.capabilities.performance flips to true. */
  performance?: PerformanceRow[];
  /** Server-precomputed live return / alpha as of the latest cached close.
   *  See LivePerformance. */
  live_performance?: LivePerformance | null;
}

// ---- Analysis-quality feedback ---------------------------------------------
// Signed-in users rate the quality of a dealing's deep analysis (thumbs up /
// down + optional comment) at the bottom of the analysis article. Stored in
// D1 (`analysis_ratings`, migration 028) via POST /api/analysis-feedback,
// keyed by a server-verified Firebase uid. iOS-only for now; Android/web are
// additive later. Internal quality/eval signal — not surfaced to other users.

/** Thumbs up (1) or thumbs down (-1). */
export type AnalysisFeedbackVote = 1 | -1;

/** Request body for POST /api/analysis-feedback. The uid is NOT taken from the
 *  body — it's derived from the verified Firebase ID token in the
 *  Authorization: Bearer header (see worker/lib/firebase-auth.ts). */
export interface AnalysisFeedbackRequest {
  dealing_id: string;
  market: Market;
  vote: AnalysisFeedbackVote;
  /** Optional free text, trimmed and capped at 1000 chars server-side. */
  comment?: string;
  /** The analysis quality tier the client is showing at vote time. Captured
   *  as a review annotation so feedback can be sliced by tier; the client
   *  already has `analysis.rating` on screen. */
  analysis_rating?: Rating;
  /** Client build string, e.g. "1.3.0 (412)". Capped at 40 chars. */
  app_version?: string;
}

/** A row in `analysis_ratings`. */
export interface AnalysisFeedbackRow {
  dealing_id: string;
  user_uid: string;
  market: Market;
  vote: AnalysisFeedbackVote;
  comment: string | null;
  analysis_rating: Rating | null;
  app_version: string | null;
  client: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// USG — US government-insider (congressional) trading
// ============================================================================
// STOCK Act Periodic Transaction Reports (PTRs). Kept as its own wire format
// (like EuDealing) rather than overloaded onto UsDealing, which is Form-4
// shaped (CIK, transaction codes, 10b5-1, derivative tables — all
// inapplicable). The key structural difference from director dealings: there
// is NO reporter⟷issuer relationship (a member buys any company), so the edge
// is legislative jurisdiction / cross-member clustering, not own-company
// conviction — reflected in the triage layer, not the wire shape.
//
// Sources: House Clerk disclosures (static, Worker-reachable; PTR detail from
// text-layered PDFs) AND the Senate eFD portal (efdsearch — Akamai-walled to
// datacenter IPs, so fetched via Firecrawl's stealth proxy; PTR detail is an
// HTML table). See ../pipeline/us-gov and
// investigations/2026-06-11-senate-efdsearch-ingest.md.

export type GovChamber = "house" | "senate";
export type GovOwner = "self" | "spouse" | "joint" | "child";
export type GovTransactionType = "purchase" | "sale_full" | "sale_partial" | "exchange" | "other";
export type GovTriageVerdict = "skip" | "maybe" | "promising";

/** A single driver behind a row's rating/verdict, in plain English. `sign`
 *  tells the UI whether it pushed the score up (pos), down (neg), or is just
 *  context (neutral). */
export type GovFactorSign = "pos" | "neg" | "neutral";
export interface GovRatingFactor {
  text: string;
  sign: GovFactorSign;
}
/** Derived (never hand-written) explanation of why a Congress row got its
 *  label — see `explainGov`. Always consistent with the deterministic score. */
export interface GovRatingExplain {
  /** One-line summary keyed off the verdict + rating. */
  headline: string;
  /** Ordered drivers — positives first, then the drags, then context. */
  factors: GovRatingFactor[];
}

/** Slow-moving, member-level context that feeds the deterministic rating (see
 *  `govRating`) and explains it in the UI. Sourced once per member, cached on
 *  the roster. All fields optional — an unassessed member carries none.
 *  See investigations/2026-06-11-gov-member-profiles-mock.md */
export interface GovMemberProfile {
  /** true = trades run by a fiduciary/discretionary manager (mechanical, not
   *  informed → damped, never marquee); false = assessed self-directed
   *  conviction trader; null/absent = unassessed (scored neutral). */
  advisor_managed?: boolean | null;
  /** Disclosure-derived net-worth band (USD). Materiality context for the UI;
   *  not yet wired into the score (v2). */
  net_worth_min?: number | null;
  net_worth_max?: number | null;
  /** Human-readable basis for the assessment (the "why", e.g. "office says an
   *  outside firm has full discretion"). */
  note?: string | null;
  /** Provenance URL the assessment was sourced from. */
  source?: string | null;
}

export interface GovReporter {
  /** Bioguide ID — Congress's canonical member key (e.g. "W000798"). The PTR
   *  feed only carries a free-text name; ingest resolves it against the free
   *  @unitedstates/congress-legislators roster. Stable across feeds + filings. */
  id: string;
  name: string;
  chamber: GovChamber;
  party?: "D" | "R" | "I";
  /** 2-letter state. */
  state?: string;
  /** House district number; absent for senators. */
  district?: number;
  /** Committee names from the roster — the jurisdiction signal. NOTE: resolved
   *  from the current roster today; effective-dating to the trade's Congress is
   *  a known follow-up (committee assignments turn over each Congress). */
  committees?: string[];
  /** Official member portrait (public-domain), served from our R2 mirror at
   *  /api/gov/photo/:bioguide. Absent when the member has no Bioguide id. */
  photo_url?: string;
  /** Short, strictly-factual biography (2-3 sentences: party + seat + tenure,
   *  prior career, committee focus) shown atop the member's profile drawer.
   *  Authored in-chat and seeded; absent for members without one yet. */
  bio?: string;
  /** Member-profile context (advisor-managed status, net worth) — drives and
   *  explains the rating. Absent for unassessed members. */
  profile?: GovMemberProfile;
}

export interface GovDealing {
  /** Content-hash identity: `cap-{sha1(filing_id|row_seq|owner|ticker|
   *  trade_date|tx|amount_min|amount_max)[:16]}`. `row_seq` is IN the hash
   *  because a PTR can legitimately repeat an identical line (same member /
   *  ticker / band / day) — hashing content alone would silently collapse the
   *  duplicate. `row_seq` comes from the PDF's own table order (stable unless
   *  the parser changes), so the id only moves when position or content does. */
  id: string;
  /** Position of this row within its filing's table (stable secondary key). */
  row_seq: number;
  /** Source PTR filing id (House DocID). Groups multi-leg same-filing rows. */
  filing_id: string;
  trade_date: string;          // ISO — PTR transaction date
  /** ISO — PTR notification/filing date. Disclosure lags the trade by up to
   *  ~45 days (and far more on amendments), so the "since disclosure" return is
   *  anchored here, NOT trade_date — what a copycat could actually enter at. */
  disclosed_date: string;
  created_at?: string;         // ISO datetime UTC — when ingested

  reporter: GovReporter;

  /** Issuer ticker (no exchange suffix). Null on scanned/unparseable rows,
   *  which user-facing query paths hide. */
  ticker: string | null;
  company: string;             // PTR asset description
  currency: "USD";
  /** Normalised PTR asset class: "stock" today; "option" and others carried
   *  verbatim-lowercased. Non-share classes are filtered from signal views. */
  asset_type: string;
  transaction_type: GovTransactionType;
  /** Acquired (A) vs disposed (D). Null for exchanges/other. */
  acquired_disposed: "A" | "D" | null;
  owner: GovOwner;

  /** Amounts are disclosed as a BAND, never an exact figure. `amount_mid` is a
   *  midpoint estimate for sort/display only — never treat as a real value. */
  amount_min: number | null;
  amount_max: number | null;
  amount_mid: number | null;

  /** Close on `disclosed_date` (USD), nearest prior trading day. Anchors the
   *  copycat return. Nullable when bars aren't cached. Mirrors
   *  `UsDealing.disclosed_close`. */
  disclosed_close?: number | null;
  /** Server-precomputed live return / alpha as of the latest cached close.
   *  Congress PTRs carry no per-share fill price, so the `*_trade` anchor is
   *  measured from the close on the trade date. See LivePerformance. */
  live_performance?: LivePerformance | null;
  /** Filed past the STOCK Act 45-day window — a governance signal in itself. */
  is_late?: boolean;
  /** Replicable copycat buy: open-market common-stock purchase at a real
   *  ticker. Mirrors `UsDealing.is_open_market_buy` / EU's share filter. */
  is_open_market_buy?: boolean | null;
  /** True when the PTR is an amendment. Mirror of the US posture — surface
   *  alongside the original with a badge; no supersession logic. */
  is_amendment?: boolean;
  original_filing_date?: string;
  /** Canonical source filing URL. */
  ptr_link: string;

  /** SEC `sicDescription` for the issuer (free-text industry), joined at read
   *  time. Mirrors `UsDealing.sector`. */
  sector?: string | null;
  /** Normalised ICB top-level industry via the shared us-sic-to-icb mapping
   *  (SEC SIC → ICB), so USG issuers group alongside US/UK ones. Mirrors
   *  `UsDealing.sector_normalized`. */
  sector_normalized?: SectorNormalized | null;

  /** Triage verdict + reason for this row, joined in by the read API. Same
   *  nested shape as the other markets' `triage`. Driven by a deterministic
   *  feature floor (jurisdiction overlap / cluster / owner / size) plus an LLM
   *  precision pass. */
  triage?: { verdict: GovTriageVerdict; reason: string };

  /** Deterministic classification (significant | noteworthy | minor) from the
   *  frozen govRating scoring matrix, computed at read for every signal row —
   *  this is the user-facing label (the triage verdict is pipeline-internal).
   *  Matches `analysis.rating` when a narrative analysis exists. */
  rating?: Rating;

  /** Plain-English breakdown of WHY this row got its verdict/rating, derived
   *  from the same deterministic factors the scorers use (jurisdiction, owner,
   *  deliberateness, concentration, cluster, size, leverage). Present for every
   *  row including skips, so the detail drawer can explain the label rather
   *  than leaving it opaque. */
  rating_explain?: GovRatingExplain;

  /** Deep analysis, when present (capability gated; off at launch). Same
   *  `Analysis` payload as every other market. */
  analysis?: Analysis | null;

  /** Cross-member cluster: distinct OTHER members acquiring the same issuer in
   *  a tight window. Stronger signal here than for corporates. Mirrors
   *  `Dealing.cluster`. */
  cluster?: ClusterInfo | null;
}

// ============================================================================
// Broker comparison / affiliate directory
// ============================================================================
// Editorial, hand-curated comparison of retail trading/investment platforms.
// Not scraped — served from a typed constant module (worker/data/uk-brokers.ts,
// mirroring worker/fixtures.ts) via GET /api/brokers?market=UK. Consumed by
// ddbx-site's /compare grid + /brokers/:slug detail pages; iOS/Android may
// consume later. Market-scoped from day one (UK only today) so US/EU rows drop
// in without route or schema changes — same pattern as EuDealing's `market`.
//
// Compliance note (see ddbx-data/investigations/broker-comparison/fca-compliance.md):
// multi-asset brokers are listed for their mainstream investing/ISA side only.
// `assets.crypto` / `assets.options` are factual feature flags — consumers must
// NOT surface a CTA or affiliate link to high-risk (CFD/crypto) products.

/** Markets the broker directory covers. UK-only today; append to widen the
 *  union (US, EU) — same as-const + guard idiom as MARKETS / EU_MARKETS. */
export const BROKER_MARKETS = ["UK"] as const;
export type BrokerMarket = (typeof BROKER_MARKETS)[number];

export function isBrokerMarket(v: unknown): v is BrokerMarket {
  return (
    typeof v === "string" &&
    (BROKER_MARKETS as readonly string[]).includes(v)
  );
}

/** Editorial award badges. `top_pick` is the overall recommendation crown
 *  (Freetrade + Trading 212 today); the rest are "best for X" entry points so
 *  every reader finds a relevant pick. Closed set so the UI can map each to a
 *  label/icon. */
export const BROKER_BADGES = [
  "top_pick",
  "best_for_beginners",
  "best_for_isa",
  "best_for_sipp",
  "best_for_lisa",
  "lowest_cost",
  "best_for_fractional",
  "best_for_us_stocks",
  "best_for_funds",
  "best_for_active_traders",
] as const;
export type BrokerBadge = (typeof BROKER_BADGES)[number];

/** Fees & costs. All monetary fields GBP; percent fields are plain numbers
 *  where 0.45 means 0.45%. 0 = genuinely free; null = unknown or N/A. */
export interface BrokerFees {
  /** Flat platform/account fee per month in GBP (0 if none). */
  platform_fee_monthly_gbp: number | null;
  /** Percentage platform/custody fee per year (e.g. 0.25 = 0.25%). */
  platform_fee_pct: number | null;
  /** Free-text caveat on the platform fee (caps, tiers, per-account). */
  platform_fee_note: string | null;
  /** Commission per UK share trade in GBP (0 = commission-free). */
  trade_commission_uk_gbp: number | null;
  /** Commission per US share trade in GBP (0 = commission-free). */
  trade_commission_us_gbp: number | null;
  /** Per-deal charge for funds/OEICs in GBP, where it differs from shares. */
  fund_dealing_gbp: number | null;
  /** FX / currency-conversion fee on non-GBP trades as a percent. */
  fx_fee_pct: number | null;
  /** Withdrawal fee in GBP (0 if free). */
  withdrawal_fee_gbp: number | null;
  /** Free-text inactivity-fee note (null if none). */
  inactivity_fee_note: string | null;
  /** Minimum to open/fund an account in GBP (0 if none). */
  min_deposit_gbp: number | null;
  /** One-line plain-English summary of the charging model. */
  fee_model: string | null;
}

/** Which tax wrappers / account types the platform offers. true = offered,
 *  false = not offered, null = unknown. */
export interface BrokerAccounts {
  /** General (taxable) investment account. */
  gia: boolean | null;
  /** Stocks & Shares ISA. */
  stocks_isa: boolean | null;
  /** Self-invested personal pension (self-select). A managed personal pension
   *  is NOT a SIPP — flag false and explain in sipp_note. */
  sipp: boolean | null;
  /** Lifetime ISA. */
  lisa: boolean | null;
  /** Junior ISA. */
  jisa: boolean | null;
  isa_note: string | null;
  sipp_note: string | null;
}

/** Investable assets & market access. true = available, false = not, null =
 *  unknown. crypto/options are factual flags only — do not promote (see the
 *  compliance note above). */
export interface BrokerAssets {
  uk_shares: boolean | null;
  us_shares: boolean | null;
  /** Markets beyond UK/US (Europe, Asia, etc.). */
  global_shares: boolean | null;
  etfs: boolean | null;
  /** OEICs / unit trusts. */
  mutual_funds: boolean | null;
  investment_trusts: boolean | null;
  fractional_shares: boolean | null;
  bonds_gilts: boolean | null;
  options: boolean | null;
  crypto: boolean | null;
  /** Count of exchanges/countries if the platform publishes one. */
  num_markets: number | null;
}

/** Trust signals & platform features. */
export interface BrokerTrust {
  /** FSCS £85k protection applies. */
  fscs_protected: boolean | null;
  /** Primary regulator, usually "FCA". */
  regulator: string | null;
  year_founded: number | null;
  headquarters: string | null;
  /** Pays interest on uninvested cash. */
  interest_on_cash: boolean | null;
  interest_on_cash_note: string | null;
  /** Recurring / scheduled auto-investing. */
  auto_invest: boolean | null;
  /** Automatic dividend reinvestment (DRIP). */
  dividend_reinvestment: boolean | null;
  web_platform: boolean | null;
  mobile_app: boolean | null;
  /** Apple App Store rating (0–5). */
  app_store_rating: number | null;
  /** Google Play rating (0–5). */
  play_store_rating: number | null;
  trustpilot_rating: number | null;
}

/** One retail platform in the comparison directory. */
export interface BrokerOffer {
  /** URL slug, e.g. "freetrade". Stable key for /brokers/:slug. */
  slug: string;
  /** Display name, e.g. "Freetrade". */
  name: string;
  /** Jurisdiction this row describes. */
  market: BrokerMarket;
  /** Logo asset URL (optional; filled in as assets land). */
  logo_url?: string | null;
  /** Brand accent hex (e.g. "#00A7E1") for consumer hero tinting. Decorative
   *  only — consumers must render fine at low opacity over their own surfaces
   *  and fall back to a neutral wash when null. */
  brand_color?: string | null;
  /** Canonical homepage (non-affiliate). */
  website_url: string;
  /** One-line "who this is best for". */
  tagline: string;
  /** 2–3 sentence neutral review (detail page). */
  summary: string | null;
  /** Detail-page bullet points. */
  pros: string[];
  cons: string[];
  /** Editorial award badges. */
  badges: BrokerBadge[];
  /** Overall top pick (the recommendation crown). */
  recommended: boolean;
  /** Editorial sort weight (lower = higher); optional. */
  rank?: number | null;

  /** Whether a referral/affiliate link exists for this platform. */
  has_affiliate: boolean | null;
  /** The owner's affiliate/referral URL. Null until supplied — consumers must
   *  fall back to website_url and render the link without a referral. */
  affiliate_url: string | null;
  /** Current new-customer incentive headline, if any. */
  offer_headline: string | null;
  /** Brief offer T&Cs. */
  offer_terms: string | null;
  /** ISO date the offer expires, or null for open-ended. */
  offer_expires: string | null;

  fees: BrokerFees;
  accounts: BrokerAccounts;
  assets: BrokerAssets;
  trust: BrokerTrust;

  /** ISO date the figures were last checked against official sources. */
  last_verified: string;
  /** URLs backing the data (official fee pages etc.). */
  sources: string[];
  /** Map of important field paths → the source URL backing each. */
  field_sources?: Record<string, string>;
  /** Editorial confidence/caveat notes (not shown to users). */
  confidence_notes?: string | null;
}
