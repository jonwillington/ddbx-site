// Types for shared/tape.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

export type TapeMarketId = "KR" | "SE" | "NL" | "UK" | "US";

export interface TapeMarket {
  id: TapeMarketId;
  name: string;
  city: string;
  timeZone: string;
  /** Minutes of the local day. */
  open: number;
  close: number;
  currency: string;
  noun: string;
  source: string;
  filers: string;
  ratings: "layer" | "none";
  included: string;
  cadence: string;
  timeKind: "published" | "seen" | "day";
}

export type TapeSide = "buy" | "sell" | "other";
export type TapeAtKind = "published" | "seen" | "day";
export type TapeRatingState =
  | "rated"
  | "skipped"
  | "reviewing"
  | "unrated"
  | "no-layer";

export interface TapeRow {
  key: string;
  market: TapeMarketId;
  company: string;
  ticker: string | null;
  logoTicker: string | null;
  logoDomain: string | null;
  insider: { name: string; role: string | null; pca: boolean };
  side: TapeSide;
  action: string;
  shares: number | null;
  price: number | null;
  value: number | null;
  currency: string;
  /** Server-supplied sterling reading (Korea only). */
  gbp: number | null;
  tradeDate: string | null;
  disclosedDate: string;
  /** Sort instant, ms. */
  at: number;
  atKind: TapeAtKind;
  rating: string | null;
  triage: string | null;
  cluster: { count: number; windowDays: number } | null;
  flags: string[];
  /** Site path of the row's destination. Link through `tapeRowHref`, which
   *  makes it absolute when another domain owns the market. */
  href: string | null;
  legs: number;
  hasRatingLayer: boolean;
  ratingState: TapeRatingState;
}

export interface TapeFeed {
  status: "ok" | "failed";
  rows: TapeRow[];
  /** Rows the endpoint returned before leg-merging. */
  raw: number;
  /** Rows asked for; a feed that returned this many may have more. */
  requested: number;
  fetchedAt: number;
}

export type TapeFeeds = Record<TapeMarketId, TapeFeed>;

export declare const TAPE_MARKETS: TapeMarket[];
export declare const TAPE_LIMIT: number;
export declare const TAPE_LIMITS: Record<TapeMarketId, number>;
export declare const TAPE_METHODOLOGY: string[];

export declare function tapeFeedUrl(
  apiBase: string,
  marketId: TapeMarketId,
  limit?: number,
): string | null;
export declare function tapeMarket(id: string): TapeMarket | null;
export declare function ratingState(row: TapeRow): TapeRatingState;
export declare function normaliseFeed(
  marketId: TapeMarketId,
  payload: unknown,
): TapeRow[];
export declare function compareTapeRows(a: TapeRow, b: TapeRow): number;
export declare function mergeTape(
  feeds: Partial<TapeFeeds> | null | undefined,
): { rows: TapeRow[]; floor: string | null; binding: TapeMarketId[] };
export declare function addDays(isoDate: string, days: number): string;
export declare function fetchTapeFeeds(opts: {
  apiBase: string;
  fetchImpl?: typeof fetch;
  cf?: unknown;
}): Promise<TapeFeeds>;

export declare function formatNative(
  value: number | null | undefined,
  currency: string,
): string | null;
export declare function formatGbpApprox(
  gbp: number | null | undefined,
): string | null;
export declare function formatShares(
  n: number | null | undefined,
): string | null;
export declare function formatLocalClock(ms: number, timeZone: string): string;
export declare function formatDayLong(isoDate: string): string;
export declare function formatDayShort(isoDate: string): string;
export declare function formatSessionHours(m: TapeMarket): string;
export declare function todayIn(timeZone: string, now?: Date): string;
export declare function rowClock(row: TapeRow): string | null;
export declare function tapeRowHref(
  row: Pick<TapeRow, "market" | "href">,
  hostname: string | null | undefined,
): string | null;

export interface TapeMarketState {
  id: TapeMarketId;
  name: string;
  state: "on" | "quiet" | "failed";
  count: number;
  latest: string | null;
}

export declare const TAPE_MARKET_NAMES: Record<TapeMarketId, string>;
export declare function joinMarketNames(ids: string[]): string;
export declare function tapeMarketStates(
  feeds: Partial<TapeFeeds> | null | undefined,
  rows: TapeRow[],
): TapeMarketState[];
export declare function tapeSummary(
  rows: TapeRow[],
  states: TapeMarketState[],
  floor: string | null,
): string;
export declare function tapeCoverageNow(
  state: TapeMarketState,
  floor: string | null,
): string;
