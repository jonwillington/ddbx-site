// Types for shared/studies.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

import type { Dealing, UsDealing } from "../src/types/ddbx";

export type StudyMarket = "UK" | "US";
export type StudyRow = Dealing | UsDealing;

/** One row of /api/outcomes. Mirrors `OutcomeEvent` in ddbx-data's
 *  worker/db/types.ts (branch feat/study-horizon-alpha); declared here until
 *  that branch merges and `npm run sync:types` brings it into src/types. */
export interface StudyOutcome {
  event_id: string;
  anchor_date: string;
  entry_date: string;
  exit_date: string;
  /** PERCENT. */
  return_pct: number;
  bench_return_pct: number | null;
  /** PERCENT. */
  abnormal_return_pct: number | null;
  flags: string[];
}

export interface StudyOutcomesBody {
  market: StudyMarket;
  anchor: "trade" | "disclosed";
  horizon_days: number;
  benchmark: string;
  resolved_through: string | null;
  outcomes: StudyOutcome[];
}

export declare const HORIZON_DAYS: number;
export declare const OUTCOME_ANCHOR: "disclosed";
export declare const EXCLUDED_FLAGS: string[];
export declare const MIN_CELL: number;
export declare const MIN_COMPANIES: number;
export declare const SIGNIFICANCE: number;
export declare const STUDY_FLOOR: Record<StudyMarket, number>;
export declare const ARRIVAL_WEEKS: number;
export declare const STUDY_SINCE: string;
export declare const RESEARCH_INDEX_PATH: string;
export declare const RESEARCH_HOST: Record<StudyMarket, string>;
export declare const METHODOLOGY: string[];

/** A purchase: one UK dealing, or one US Form 4 (filing, code, reporter). */
export interface StudyPurchase {
  key: string;
  company: string;
  date: string;
  value: number;
  row: StudyRow;
}

export interface StudyCellDef {
  id: string;
  label: string;
  /** Lowercase phrase for prose: "purchases by chief executives". */
  noun: string;
  /** Id of the cell this one is a breakdown of; shown indented, never
   *  compared. */
  nested?: string;
  test: (p: StudyPurchase, market: StudyMarket) => boolean;
}

export interface StudyBoard {
  to: string;
  title: string;
}

export interface Study {
  slug: string;
  /** Index label: "CEO versus CFO". */
  short: string;
  /** The question, as the h1. */
  title: string;
  /** One line, for the index and the SERP. */
  summary: string;
  standfirst: string;
  /** Whether STUDY_FLOOR applies. */
  floor: boolean;
  test: "difference" | "trend";
  cells: (market: StudyMarket) => StudyCellDef[];
  /** The cell ids the verdict tests: subject first for a difference, smallest
   *  first for a trend. */
  compare: string[] | ((market: StudyMarket) => string[]);
  /** Where the filings behind the cells are listed by name. */
  boards: StudyBoard[];
  /** Per-study methodology lines, printed after METHODOLOGY. */
  method: string[];
  caveats: string[];
}

export declare const STUDIES: Study[];
export declare const STUDY_SLUGS: string[];

export declare function studyBySlug(
  slug: string | null | undefined,
): Study | null;
export declare function researchIndexPath(market?: StudyMarket): string;
export declare function studyPath(
  slug?: string | null,
  market?: StudyMarket,
): string;
export declare function studyCanonical(
  slug: string | null | undefined,
  market: StudyMarket,
): string;
export declare function parseResearchPath(
  pathname: string | null | undefined,
): { market: StudyMarket; study: Study | null | undefined } | null;

export declare function longDate(iso: string | null | undefined): string;
export declare function isoDay(today?: Date | string | number): string;

export interface StudyWindowRequest {
  market: StudyMarket;
  since: string;
  view: "all" | null;
  windowOn: "disclosed";
}
export declare function studyWindow(market: StudyMarket): StudyWindowRequest;
export declare function fetchOutcomes(args: {
  apiBase: string;
  market: StudyMarket;
  fetchImpl?: typeof fetch;
  cf?: unknown;
}): Promise<{ ok: boolean; body: StudyOutcomesBody | null }>;
export declare function toPurchases(
  dealings: StudyRow[] | null | undefined,
  market: StudyMarket,
): StudyPurchase[];

export declare function wilson(
  k: number,
  n: number,
  z?: number,
): { lo: number; hi: number } | null;
export declare function normCdf(x: number): number;
export declare function incompleteBeta(x: number, a: number, b: number): number;
export declare function tTwoSidedP(t: number, df: number): number;
export declare function tCritical(df: number, alpha?: number): number;

export interface ClusteredFit {
  estimate: number;
  intercept: number;
  se: number;
  seNaive: number;
  n: number;
  clusters: number;
  df: number;
  t: number;
  p: number;
  interval: { lo: number; hi: number };
}
export declare function clusteredSlope(
  obs: Array<{ x: number; y: number; g: string | number }>,
): ClusteredFit | null;
export declare function designEffect(
  obs: Array<{ y: number; g: string | number }>,
): number;
export declare function cochranArmitageZ(
  table: Array<{ beats: number; n: number }>,
): number;
export declare function sampleForGap(
  p1: number,
  p2: number,
  deff?: number,
): number | null;
export declare function shortHash(str: string): string;

export interface DatasetVersion {
  asOf: string | null;
  hash: string;
  count: number;
  /** "2026-09-16.b711d0aeb415" */
  id: string;
}
export declare function datasetVersion(
  sample: Array<{
    key: string;
    cells?: string[];
    alpha: number;
    exitDate?: string;
  }>,
): DatasetVersion;

/** When a cell under a floor should clear both. Null once it has. */
export interface Clearance {
  /** Resolved purchases still missing. */
  needed: number;
  /** Companies still missing. */
  neededCompanies: number;
  /** Purchases already filed whose 90 days have not passed. */
  queued: number;
  /** ISO date, or null when there is nothing to project from. */
  clearsOn: string | null;
  /** True when the queue alone should carry the cell over. */
  fromQueue: boolean;
}

export interface StudyCell {
  id: string;
  label: string;
  noun: string;
  nested: string | null;
  n: number;
  beats: number;
  companies: number;
  pending: number;
  designEffect: number;
  /** Null below either floor: not stated, rather than unknown. Ratios. */
  beatRate: number | null;
  interval: { lo: number; hi: number } | null;
  medianAlpha: number | null;
  meanAlpha: number | null;
  clearance: Clearance | null;
}

export interface StudyUniverse {
  eligible: number;
  inScope: number;
  scored: number;
  companies: number;
  beatRate: number | null;
  pending: number;
  flagged: number;
  unpriced: number;
  resolutionYield: number;
  arrivalsWeekly: number;
}

export interface MissingCell extends Clearance {
  id: string;
  label: string;
  n: number;
  companies: number;
}

export type StudyVerdict =
  | { state: "waiting"; missing: MissingCell[] }
  | {
      state: "open";
      p: number;
      gap: number;
      leader: string | null;
      neededPerCell: number | null;
      neededCompaniesPerCell: number | null;
    }
  | {
      state: "answered";
      p: number;
      gap: number;
      leader: string;
      trailer: string;
    }
  | {
      state: "open" | "answered";
      p: number;
      slope: number;
      direction: "up" | "down" | null;
    };

export interface StudyResult {
  slug: string;
  market: StudyMarket;
  computedOn: string;
  horizonDays: number;
  /** Latest exit date in the sample. */
  asOf: string | null;
  dataset: DatasetVersion;
  universe: StudyUniverse;
  cells: StudyCell[];
  compareIds: string[];
  kind: "difference" | "trend";
  test: (ClusteredFit & { designEffect: number }) | null;
  verdict: StudyVerdict;
  /** False while waiting: noindexed and out of the sitemap. */
  indexable: boolean;
}

export declare function computeStudy(
  study: Study,
  dealings: StudyRow[] | null | undefined,
  outcomes: StudyOutcome[] | null | undefined,
  market: StudyMarket,
  today?: Date | string,
): StudyResult;

export declare const num: (n: number) => string;
export declare function pct(ratio: number | null | undefined): string;
export declare function signedPp(ratio: number | null | undefined): string;
export declare function pValue(p: number): string;
export declare function verdictHeadline(result: StudyResult): string;
export declare function verdictDetail(
  result: StudyResult,
  market: StudyMarket,
): string;
export declare function stateLabel(result: StudyResult): string;
export declare function measurementLine(result: StudyResult): string;
export declare function datasetSentence(
  result: StudyResult,
  market: StudyMarket,
): string;

export interface Citation {
  title: string;
  url: string;
  computedOn: string;
  asOf: string | null;
  accessed: string;
  version: string;
  sample: number;
  line: string;
}

export declare function citation(
  study: Study,
  result: StudyResult,
  accessed: Date | string,
): Citation;

/** The rules the research index lists. */
export declare function indexRules(): string[];
/** The floor sentence, for a study that applies STUDY_FLOOR. */
export declare function floorLine(market: StudyMarket, floor: number): string;
/** Limits every study shares, printed after its own caveats. */
export declare const SHARED_LIMITS: string[];
