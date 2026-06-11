// Multi-market plumbing for the public site. One MarketConfig per market;
// the generic <MarketPage> reads it and renders the same shape (header,
// hero, today, monthly list, drawers) regardless of where the data comes
// from. New markets land as a new MarketConfig file — nothing in the shell
// should grow per-market branches.
//
// Strategy: the wire-format types stay per-market (UK `Dealing`, US
// `UsDealing`, EU `EuDealing`) because they're genuinely different — Form 4
// has footnotes and 10b5-1 flags, RNS has the AIM-tier concept, etc.
// MarketDealing is the *shared columns* the shell renders. Anything richer
// stays on the wire row (`raw`) and is surfaced through component slots
// (RowActionCell, DetailBody) that the market provides.
//
// Companion: ~/ddbx-ios-app/investigations/multi-market/strategy.md lays
// out the equivalent decision for iOS — option (b), "translate at the
// edge, two wire contracts."

import type { ComponentType, ReactNode } from "react";
import type { PriceFormat } from "@/components/position-card";
import type { MarketSession } from "@/lib/market-status";
import type { HolidaySource } from "@/lib/bank-holidays";
import type { ClusterInfo, LivePerformance, Rating } from "@/types/ddbx";

/** Triage label string. Markets are free to use their own taxonomies — the
 *  hero / today card just renders whatever the adapter produces. */
export type Tone = "buy" | "sell" | "plan" | "grant" | "exercise" | "neutral";

/** Columns in the shared chronological table — keys for per-market header
 *  tooltip copy (MarketConfig.columnHelp). */
export type MarketColumnKey =
  | "disclosed"
  | "ticker"
  | "company"
  | "value"
  | "trend"
  | "performance"
  | "action";

/** The shared row surface. One per logical card in the list — adapters do
 *  whatever bucketing they need (US groups Form 4 legs by filing_id; UK is
 *  1:1 with Dealing). `raw` is the original wire row, kept so slot
 *  components can read market-specific fields without re-fetching. */
export interface MarketDealing<W = unknown> {
  /** Unique key for selection / list keys. Stable across refetches. */
  key: string;
  /** Display identifier. Used in URLs (UK uses Dealing.id). May equal `key`. */
  id: string;

  ticker: string;
  company: string;
  insiderName: string;
  insiderRole?: string;
  /** Optional insider avatar (member portrait for Congress). Person-grouped
   *  views anchor the group on it; falls back to initials when absent. */
  insiderPhotoUrl?: string;
  /** Optional political party ("D" | "R" | "I"), for markets where the actor
   *  has one (Congress). Drives the party chip + party filter. Undefined when
   *  unknown / not applicable. */
  party?: string;
  /** Optional chamber ("house" | "senate"), for Congress. Drives the chamber
   *  chip + chamber filter. Undefined for non-Congress markets. */
  chamber?: string;

  /** ISO `YYYY-MM-DD…` strings — disclosure on the regulator side. Used for
   *  month/day bucketing and "today" detection. */
  disclosedDate: string;
  /** When the underlying trade happened. Often === disclosedDate. */
  tradeDate: string;

  /** Whether to render this row at full opacity. False rows render muted —
   *  for UK that's "didn't pass the analyst filter"; for US it's grants /
   *  exercises / footnoted non-trades. */
  isPurchase: boolean;

  /** Trade value in the market's domestic major currency unit. null when
   *  every leg was footnote-priced. */
  value: number | null;
  /** Per-share entry price in the same major-currency unit as `value`. */
  entryPrice: number | null;
  /** Total shares (sum across legs for US tranche-split filings). */
  shares: number;
  /** Number of underlying wire rows folded into this MarketDealing. >1 only
   *  on US tranche splits today. */
  legCount: number;

  /** Optional rating, when the market has a deep-analysis pipeline. Same
   *  Rating union the UK uses; markets without analysis omit this. */
  rating?: Rating;
  /** Optional triage verdict, when the market has a triage pass. US uses
   *  "promising" | "maybe" | "skip". */
  triageVerdict?: string;
  /** Optional one-liner from the deep-analysis pipeline. Surfaced by the
   *  Today hero so each card teases its summary; markets without analysis
   *  leave this undefined. */
  summary?: string;

  /** Optional ICB top-level industry (normalized sector), when the wire row
   *  carries one. Surfaced in the detail drawer's metadata grid — mirrors the
   *  iOS DealDetailView "Industry" metric. */
  sector?: string;
  /** Optional analyst confidence (0..1) from the deep-analysis pipeline. */
  confidence?: number;
  /** Optional catalyst window ("3m" | "6m" | "12m") from deep analysis. */
  catalystWindow?: string;

  /** Cluster signal computed server-side — 2+ insiders buying the same issuer
   *  in a ±14d (strong) / ±30d (soft) window. Surfaced as a chip on the row +
   *  detail drawer. null/undefined when this dealing isn't part of a cluster.
   *  Read off the wire row's `cluster` field in each market's toMarketDealing. */
  cluster?: ClusterInfo | null;

  /** Server-precomputed return / alpha as of the latest cached close, for both
   *  the trade and disclosure anchors. When present, the row renders its
   *  performance badge straight from this — no per-visitor price fetch, no
   *  fan-out. Falls back to the client-side computation (off fetched prices)
   *  when absent. Read off the wire row's `live_performance`. */
  livePerformance?: LivePerformance | null;

  /** Human-readable action ("Open-market buy", "Director purchase"). */
  actionLabel: string;
  /** Visual tone for action chip + row muting decisions. */
  actionTone: Tone;

  /** The wire row that produced this MarketDealing. Slot components read
   *  market-specific extras off this. Typed via generic so each market keeps
   *  its own structure. */
  raw: W;
}

/** Counts surfaced by the view tab strip and footer. The adapter populates
 *  these from whatever backend it talks to. */
export interface MarketStats {
  total: number;
  /** Map from view-id → count. Whatever view ids the market declares. */
  viewCounts: Record<string, number>;
  /** Optional caption — e.g. "Latest disclosure 2026-05-19". */
  latestDisclosedLabel?: string;
  /** Optional debug/transparency line — e.g. "By code: P=3 · S=12 · A=4". */
  debugBreakdown?: string;
}

/** One view tab definition — id matches what the adapter expects in
 *  fetchDealings({ view }). */
export interface MarketView {
  id: string;
  label: string;
}

/** Result of fetchDealings — already grouped/normalized. */
export interface DealingsPayload<W = unknown> {
  dealings: MarketDealing<W>[];
  stats: MarketStats;
}

/** News item shape that the today drawer renders. Markets without a news
 *  source can simply omit fetchNews from their MarketConfig. */
export interface NewsItem {
  url: string;
  title: string;
  source: string;
}

export interface NewsPayload {
  items: NewsItem[];
  fetched_at: string | null;
}

/** Hero-card filter pill — a second axis on top of view tabs, used by UK
 *  to narrow the "average return vs benchmark" stat to one rating tier
 *  without changing what list is being fetched. The predicate runs over
 *  MarketDealings the shell already has on hand. */
export interface HeroFilter<W = unknown> {
  id: string;
  label: string;
  predicate: (d: MarketDealing<W>) => boolean;
}

/** A config-driven extra filter axis (beyond Signal/All + Strength), rendered
 *  as an always-visible dropdown in the filter bar. The first option should be
 *  the "all / no narrowing" value (matched against `defaultValue`). The
 *  predicate returns true to KEEP a dealing; it's skipped entirely when the
 *  active value equals `defaultValue`. Congress supplies one for party. */
export interface MarketExtraFilter<W = unknown> {
  id: string;
  /** Short control label, e.g. "Party". */
  label: string;
  /** Explanatory header in the drawer, phrased as a question ("Which party?").
   *  Falls back to `label` when absent. */
  question?: string;
  /** Optional one-line explanation of the axis, shown under the control in the
   *  filter drawer (the drawer has room the inline bar didn't). */
  description?: string;
  /** Control kind. "select" (default) = one option at a time (segmented).
   *  "multiselect" = any number of options (chips); the value is a
   *  comma-joined list of selected ids, `defaultValue: ""` meaning "all". */
  kind?: "select" | "multiselect";
  /** Dropdown options — `id` is the selected value, `label` the display text.
   *  For "select", include the "show everything" option (id === defaultValue).
   *  For "multiselect", list only the real options ("" = none selected = all). */
  options: { id: string; label: string }[];
  /** The "show everything" value (no predicate applied when selected). "" for
   *  multiselect; the all-option id for select. */
  defaultValue: string;
  /** Keep the row? For multiselect, `value` is the comma-joined selection. */
  predicate: (value: string, dealing: MarketDealing<W>) => boolean;
}

export type SignalFilterValue = "signal" | "all";

/** Predicate for the top-level "Signal" filter: anything the analyst pass
 *  rated above routine. Routine and unrated rows fall outside Signal. The
 *  "All" filter value is everything (no predicate applied). */
export function isSignalDealing<W>(d: MarketDealing<W>): boolean {
  return (
    d.rating === "significant" ||
    d.rating === "noteworthy" ||
    d.rating === "minor"
  );
}

/** Standard four-bucket rating filter shared across markets. UK and US
 *  populate the buckets from the analyst pipeline; NL/SE have no ratings
 *  yet so every row falls into "Routine / unrated" until the pipeline
 *  catches up. Kept as a function so each market gets a freshly-typed
 *  array — `predicate` only reads `d.rating`, which exists on every
 *  MarketDealing regardless of W. */
export function defaultRatingHeroFilters<W>(): HeroFilter<W>[] {
  return [
    {
      id: "significant",
      label: "Significant",
      predicate: (d) => d.rating === "significant",
    },
    {
      id: "noteworthy",
      label: "Noteworthy",
      predicate: (d) => d.rating === "noteworthy",
    },
    {
      id: "routine",
      label: "Routine / unrated",
      predicate: (d) => !d.rating || d.rating === "routine",
    },
    { id: "any", label: "All", predicate: () => true },
  ];
}

/** A complete market plugin. Everything per-market hangs off here. */
export interface MarketConfig<W = unknown> {
  /** Stable identifier (`uk` | `us` | `eu` | …). Used in keys and URLs. */
  id: string;

  /** Page title — e.g. "US Form 4 (preview)". */
  title: string;
  /** Full HTML `<title>` for the dealings page. The shared DocumentTitle
   *  reads this from the active market — e.g. "ddbx · Director Dealings —
   *  UK Insider Transactions". */
  documentTitle: string;
  /** Optional full hero-headline override, replacing the templated
   *  "Which directors have been buying shares in {marketLabel} companies?".
   *  Congress sets this since members buy other companies, not themselves. */
  heroHeadline?: ReactNode;
  /** One-line hero subhead for first-time visitors — what the product does
   *  for this market. Rendered under the headline on md+ viewports only. */
  heroSubhead?: ReactNode;
  /** Explainer paragraph under the title. Markdown-y JSX is fine. */
  description: ReactNode;
  /** Optional override for the "What are we looking for?" sheet body. Markets
   *  scored by the shared six-point insider-buy checklist (UK/US/EU) leave this
   *  unset and get the default. Markets with a different signal model — Congress
   *  is flagged by committee jurisdiction / size / options / clustering, not the
   *  insider checklist — supply their own body here. */
  explainer?: ReactNode;
  /** Subtitle shown in the explainer sheet header when `explainer` is set.
   *  Defaults to the market's exchange name otherwise. */
  explainerSubtitle?: string;
  /** Short market label substituted into the shared hero headline
   *  ("Which directors have been buying shares in {marketLabel} companies?"). */
  marketLabel: string;
  /** Locale used for market-owned dates/numbers in the shared shell. Defaults
   *  to en-US when omitted. */
  locale?: string;
  /** Optional banner rendered above the hero — used by markets in
   *  early-access / beta to disclose data confidence. */
  topNotice?: ReactNode;

  /** Currency formatter bundle — used everywhere money is rendered. */
  priceFormat: PriceFormat;

  /** Optional trading-session shape — feeds the shared TodayEmpty state and
   *  any session-aware UI. UK supplies LSE; markets without a session
   *  concept can omit and the shell falls back to generic copy. */
  session?: MarketSession;
  /** Optional exchange-holiday source. UK uses GOV.UK England-and-Wales;
   *  US could supply a static NYSE map; SE similar for Nasdaq Stockholm. */
  holidays?: HolidaySource;

  /** Live-price normalization. Backend stores ticker closes in a column
   *  called `close_pence` regardless of market; for UK that's already in
   *  pence (matching dealing.price_pence); for US Yahoo's USD-cents path is
   *  observed live. Adapters supply the function that converts a raw close
   *  to the same major unit as MarketDealing.entryPrice — so the shell can
   *  compute stock return without knowing market specifics. */
  normalizeLivePrice: (
    close_pence: number,
    date?: string,
    fxRates?: Record<string, number>,
  ) => number | null;
  /** Whether the shared market shell should preload GBP/USD history so
   *  normalizeLivePrice can convert GBP-denominated price-cache rows back
   *  into native USD quotes. */
  usesGbpPerUsdFx?: boolean;

  /** Benchmark ticker passed to /api/prices — `^FTAS`, `^GSPC`, etc. */
  benchmarkTicker: string;
  /** Short label rendered in row headers, hero card, etc. */
  benchmarkLabel: string;

  /** Per-column header tooltip copy. The shared table header shows an info
   *  icon on each column whose text explains what it means for THIS market —
   *  a UK "Value" is GBP consideration, a Congress "Value" is a disclosed band,
   *  a US "Disclosed" is the Form 4 file date, etc. Any column left unset falls
   *  back to a generic description (see DEFAULT_COLUMN_HELP in market-row). */
  columnHelp?: Partial<Record<MarketColumnKey, string>>;

  /** View tabs to show (signal / interesting / all for US;
   *  significant / noteworthy / … for UK). */
  views: MarketView[];
  /** Initial selected view id. */
  defaultView: string;

  /** Poll cadence in ms; 0 to disable. Default 30s. */
  pollIntervalMs?: number;

  /** When false, MarketPage skips the per-ticker latest-price fetch and the
   *  benchmark-history fetch entirely. Set false on markets whose tickers
   *  the worker's /api/prices path doesn't know how to resolve yet (Sweden
   *  until pipeline/prices.ts learns SEK). Default true. */
  enableLivePrices?: boolean;

  /** When false, MarketRow and MarketDetailDrawer suppress the CompanyLogo
   *  bubble entirely (no empty circle, no monogram fallback). Use for
   *  markets where logo.dev coverage is thin enough that the placeholder is
   *  louder than nothing — verified for Sweden 2026-05-20: ~80% of seed-map
   *  tickers resolve to the same generic placeholder. Default true. */
  enableLogos?: boolean;

  /** Fetch dealings for a given view. Adapter does its own bucketing into
   *  MarketDealings before returning. */
  fetchDealings: (opts: { view: string }) => Promise<DealingsPayload<W>>;

  /** Optional news source. /api/news/uk for UK; nothing yet for US/EU. */
  fetchNews?: () => Promise<NewsPayload>;
  /** Heading rendered above the news strip in the today drawer. */
  newsHeading?: string;
  /** Footer caption under the news ("Refreshed at …"). */
  newsFooterNote?: ReactNode;

  /** Label for the person field in the detail drawer's header grid.
   *  Defaults to "Insider"; congress overrides to "Congress member". */
  insiderLabel?: string;

  /** Component slot rendered in the row's right-most column. Receives the
   *  MarketDealing so it can read raw extras (Form 4 amendment flag, etc).
   *  Should produce visually compact chip(s). */
  RowActionCell: ComponentType<{ dealing: MarketDealing<W> }>;
  /** Optional badge rendered in the name column beside the ClusterChip
   *  (same row as the company/insider line). For per-market read-time
   *  signals like Congress "options". Should return null when empty. */
  RowNameBadge?: ComponentType<{ dealing: MarketDealing<W> }>;
  /** Component slot rendered as the body of the modal detail drawer (the
   *  popup that opens when a row is clicked). The shell provides the
   *  chrome — backdrop, scrollable container, escape-to-close. */
  DetailBody: ComponentType<{
    dealing: MarketDealing<W>;
    /** Full loaded list, so a body can reason about sibling rows — e.g.
     *  Congress detecting how many positions shared the same filing. */
    allDealings?: MarketDealing<W>[];
  }>;
  /** Optional slot rendered above DetailBody — the position card / price
   *  chart block. Kept separate because the data wiring (live price fetch
   *  per ticker) belongs in the market, not the shell. */
  DetailPosition?: ComponentType<{ dealing: MarketDealing<W> }>;

  /** Optional override for the drawer's metadata grid. When provided, the
   *  shared drawer renders exactly these label/value cells in the standard
   *  grid instead of its default set (Action / Amount / Shares / Industry / …).
   *  Lets a market fold its own raw-filing facts into the same grid rather than
   *  scattering them through the body — e.g. Congress shows the disclosed band
   *  (not a fabricated midpoint), security, owner, trade/disclosure dates.
   *  Falsy entries are skipped so cells can be conditional. */
  detailFields?: (
    dealing: MarketDealing<W>,
  ) => Array<{ label: string; value: ReactNode } | null | false | undefined>;

  /** Empty-state copy when fetchDealings returns nothing for a given view. */
  renderEmptyState?: (opts: {
    view: string;
    stats: MarketStats | null;
    setView: (v: string) => void;
  }) => ReactNode;

  /** Optional component slot rendered when today has no filings yet. UK
   *  surfaces LSE-status-aware messaging ("Closed for Spring bank holiday"
   *  vs "No deals yet — markets reopen at 8:00"); markets without a session
   *  concept can omit this and fall back to the generic "No filings yet"
   *  copy. The slot is a Component (not a render fn) so it can hold hooks. */
  TodayEmpty?: ComponentType;

  /** Format a raw ticker for human-readable UI. The raw ticker is still passed
   *  to price/logo fetches; this is just display text. */
  formatTickerDisplay?: (ticker: string) => string;
  /** Optional market-specific row muting rule. When omitted, the shared row
   *  falls back to the historical UK rule: unrated or non-purchase rows fade. */
  isRowMuted?: (d: MarketDealing<W>) => boolean;

  /** Strength-tier filter pills (Significant / Noteworthy / Routine-unrated
   *  / All). Rendered inside the grid filter bar as a "Strength" dropdown,
   *  but only when the top-level Filter dropdown is on "signal" — picking
   *  "all" hides Strength because the rating axis no longer narrows the
   *  list meaningfully. */
  heroFilters?: HeroFilter<W>[];
  /** Default-selected hero filter id; falls back to heroFilters[0]?.id. */
  defaultHeroFilter?: string;

  /** Config-driven extra filter axes, rendered as always-visible dropdowns in
   *  the filter bar (unlike Strength, which is gated on Signal). Congress uses
   *  one for party (D / R / All). Each holds its own value; the predicate runs
   *  in the shared filteredDealings memo and returns true to KEEP the row. */
  extraFilters?: MarketExtraFilter<W>[];

  /** Suppress the dominant "Today" hero (and its "Also today · N skipped"
   *  block). Low-volume markets (Congress — PTRs disclose weeks late, so
   *  "today" is usually empty) read better without it; today's filings, when
   *  any, just fall into the chronological month list as a normal day. */
  hideTodayHero?: boolean;

  /** Default value for the top-level "Filter: Signal / All" dropdown. All four
   *  markets currently set this to "all" so the reader sees every disclosure
   *  first and narrows to the curated Signal subset themselves. Ratingless
   *  markets (NL, SE) additionally *need* "all" because "signal" would render
   *  empty until those rows pick up ratings. Unset falls back to "signal". */
  defaultSignalFilter?: SignalFilterValue;

  /** Predicate for the "Signal" filter. Markets with a deep-analysis
   *  pipeline (UK, US) leave this unset and fall back to the rating-based
   *  isSignalDealing. Markets without ratings (NL, SE) supply their own —
   *  e.g. the clean-buy heuristic the EU modules store on `isPurchase`
   *  (direct PDMR acquisition of common shares, not PCA / programme /
   *  amendment). Without this, Signal reads `d.rating` and renders empty for
   *  ratingless markets. */
  isSignal?: (d: MarketDealing<W>) => boolean;

  /** Predicate identifying "skipped" rows — dealings that exist in the data
   *  but didn't earn full analysis. The shell collapses these into a
   *  per-day cluster the user can expand. Markets without an analyst pass
   *  omit this and every row renders inline. */
  isSkipped?: (d: MarketDealing<W>) => boolean;

  /** When true, the chronological day buckets fold multiple same-company
   *  ("suggested") rows on the same day into one expandable cluster row —
   *  mirrors the iOS dashboard's ticker clustering so a company several
   *  insiders bought into doesn't produce a wall of near-identical rows.
   *  Only the prominent (non-skipped) rows cluster; skipped rows stay flat.
   *  Off by default; US keeps its own same-filing `legCount` fold instead. */
  clusterByCompany?: boolean;

  /** When true, day buckets group the prominent rows by INSIDER instead of by
   *  company — each member who traded that day folds into one expandable
   *  MemberClusterRow (their portrait anchored, connected to the company
   *  badges they bought). For Congress, where the member is the primary
   *  entity. Mutually exclusive with clusterByCompany (person wins). */
  clusterByPerson?: boolean;

  /** Discretion-gating hook. When provided, MarketDetailDrawer calls
   *  `recordView(dealId)` on open and falls back to the dummy body +
   *  overlay when `hasFullAccess(dealId)` returns false. The hook owns
   *  whatever storage it needs — the shell never touches localStorage. */
  useGating?: () => GatingInfo;
  /** Component rendered as a blurred replacement for DetailBody when the
   *  current viewer doesn't have full access. Markets supply their own so
   *  the shape/length matches their real analysis. */
  DummyDetailBody?: ComponentType<{
    dealing: MarketDealing<W>;
    allDealings?: MarketDealing<W>[];
  }>;
  /** Overlay rendered above the blurred dummy body — the "open the app" CTA.
   *  Positioned absolutely inside the drawer body. */
  AnalysisOverlay?: ComponentType;
}

/** Whether the per-row performance number (and the inline sparkline)
 *  shows the stock's own return or its alpha vs the market benchmark. */
export type ChartAxis = "raw" | "market";

/** Whether returns are measured from the trade date or from the disclosure
 *  date. Mirrors iOS `DashboardAnchor`. */
export type ChartAnchor = "trade" | "disclosure";

/** Two-axis mode that drives the inline sparkline and the right-most
 *  Performance cell on every row. Persisted to localStorage so the user's
 *  pick survives page reloads. */
export interface ChartMode {
  axis: ChartAxis;
  anchor: ChartAnchor;
}

/** Shape the shell expects back from `useGating`. Markets layer whatever
 *  policy they want behind these three fields; the shell only knows about
 *  per-deal access checks and view recording. */
export interface GatingInfo {
  /** Whether gating is on for this session at all. False = treat every
   *  drawer as fully-accessible. */
  enabled: boolean;
  /** True if the viewer is allowed to see real content for this deal. */
  hasFullAccess: (dealId: string) => boolean;
  /** Called by the shell when a drawer opens. Idempotent per dealId. */
  recordView: (dealId: string) => void;
}
