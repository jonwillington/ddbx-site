// Types for shared/days.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

import type { DailySummary, Dealing, UsDealing } from "../src/types/ddbx";

export type DailyMarketId = "UK" | "US";

export interface DailyMarket {
  id: DailyMarketId;
  marketId: "uk" | "us";
  label: string;
  noun: string;
  currency: "GBP" | "USD";
  timeZone: string;
  host: string;
  exchange: string;
  summaryTime: string;
  closures: Record<string, string>;
  since: string;
  prefix: string;
}

export type AnyRow = Dealing | UsDealing;

export type DayStatus = "before" | "closed" | "future" | "today" | "past";

export type ClosureReason =
  | { kind: "weekend" }
  | { kind: "holiday"; name: string };

export interface ClusterGroup {
  ticker: string;
  company: string;
  tier: string | null;
  count: number;
  windowDays: number;
  rows: AnyRow[];
}

export interface EditionModel {
  date: string;
  market: DailyMarketId;
  currency: "GBP" | "USD";
  filings: AnyRow[];
  count: number;
  value: number;
  rated: number;
  companies: number;
  biggest: AnyRow | null;
  clusters: ClusterGroup[];
}

export interface ArchiveDay {
  date: string;
  count: number;
  value: number;
  rated: number;
  companies: number;
}

export interface EditionFetch {
  model: EditionModel;
  summary: DailySummary | null;
  cited: AnyRow[];
  status: {
    dealings: "ok" | "failed";
    summary: "ok" | "none" | "failed";
    http: number;
  };
}

export interface ArchiveFetch {
  days: ArchiveDay[];
  stranded: number;
  complete: boolean;
}

export declare const DAILY_MARKETS: Record<DailyMarketId, DailyMarket>;
export declare function dailyMarket(market: string | null | undefined): DailyMarket;

export declare function isDateSlug(slug: string): boolean;
export declare function addDays(iso: string, days: number): string;
export declare function closureReason(iso: string, market: string): ClosureReason | null;
export declare function isTradingDay(iso: string, market: string): boolean;
export declare function prevTradingDay(iso: string, market: string): string | null;
export declare function nextTradingDay(iso: string, market: string): string | null;
export declare function todayInMarket(market: string, now?: Date): string;
export declare function latestEditionDate(market: string, now?: Date): string | null;
export declare function dayStatus(iso: string, market: string, now?: Date): DayStatus;
export declare function nearestEditionDate(iso: string, market: string, now?: Date): string | null;

export declare function dailyIndexPath(market: string): string;
export declare function dailyPath(market: string, iso: string): string;
export declare function todayPath(market: string): string;
export declare function dailyFromPath(path: string): { market: DailyMarketId; date: string | null } | null;
export declare function isTodayPath(path: string): boolean;

export declare function dayLabel(iso: string): string;
export declare function dateLabel(iso: string): string;
export declare function dayShort(iso: string): string;
export declare function monthHeading(iso: string): string;
export declare function dayMoney(value: number, currency: string): string;

export declare function isRated(d: AnyRow | null | undefined): boolean;
export declare function verdictLine(d: AnyRow | null | undefined): string;
export declare function verdictWord(d: AnyRow | null | undefined): string;
export declare function insiderOf(d: AnyRow, market: string): { name: string; role: string | null };
export declare function filingHref(d: AnyRow, market: string): string | null;

export declare function editionModel(dealings: AnyRow[], market: string, date: string): EditionModel;
export declare function editionMeetsBar(model: EditionModel | null | undefined): boolean;
export declare function editionLeadSentence(model: EditionModel, status?: DayStatus): string;
export declare function archiveLeadSentence(days: ArchiveDay[], market: string): string;
export declare function closedSentence(iso: string, market: string, status: DayStatus): string;
export declare function groupByDay(dealings: AnyRow[], market: string): { days: ArchiveDay[]; stranded: number };

export declare function fetchEdition(opts: {
  apiBase: string;
  market: string;
  date: string;
  fetchImpl?: typeof fetch;
  cf?: unknown;
}): Promise<EditionFetch>;

export declare function fetchArchive(opts: {
  apiBase: string;
  market: string;
  fetchImpl?: typeof fetch;
  cf?: unknown;
}): Promise<ArchiveFetch>;

export declare function overviewNarrative(summary: DailySummary | null | undefined): string;
export declare function clusterBuyers(
  group: ClusterGroup,
  market: string,
): Array<{ name: string; row: AnyRow }>;
