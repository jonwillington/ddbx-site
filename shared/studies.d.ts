// Types for shared/studies.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

import type { Dealing, UsDealing } from "../src/types/ddbx";

export type StudyMarket = "UK" | "US";
export type StudyRow = Dealing | UsDealing;

export declare const MIN_HORIZON_DAYS: number;
export declare const MIN_CELL: number;
export declare const SIGNIFICANCE: number;
export declare const STUDY_FLOOR: Record<StudyMarket, number>;
export declare const ARRIVAL_WEEKS: number;
export declare const RESEARCH_INDEX_PATH: string;
export declare const METHODOLOGY: string[];

export interface StudyCellDef {
  id: string;
  label: string;
  /** Lowercase phrase for prose: "purchases by chief executives". */
  noun: string;
  /** Id of the cell this one is a breakdown of; shown indented, never
   *  compared. */
  nested?: string;
  test: (d: StudyRow, market: StudyMarket) => boolean;
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
  cells: (market: StudyMarket) => StudyCellDef[];
  /** The two cell ids the verdict compares, subject first. */
  compare: string[] | ((market: StudyMarket) => string[]);
  /** Where the filings behind the cells are listed by name. */
  boards: StudyBoard[];
  /** Per-study methodology lines, printed after METHODOLOGY. */
  method: string[];
  caveats: string[];
}

export declare const STUDIES: Study[];
export declare const STUDY_SLUGS: string[];

export declare function studyBySlug(slug: string | null | undefined): Study | null;
export declare function studyPath(slug?: string | null): string;

export declare function longDate(iso: string | null | undefined): string;
export declare function isoDay(today?: Date | string | number): string;
export declare function anchorDate(d: StudyRow | null | undefined): string | null;
export declare function markAgeDays(d: StudyRow | null | undefined): number;
export declare function isScored(d: StudyRow | null | undefined): boolean;

export declare function wilson(
  k: number,
  n: number,
  z?: number,
): { lo: number; hi: number } | null;
export declare function twoProportionP(
  k1: number,
  n1: number,
  k2: number,
  n2: number,
): number;
export declare function sampleForGap(p1: number, p2: number): number | null;

/** When a cell under MIN_CELL should clear it. Null once it has. */
export interface Clearance {
  needed: number;
  /** Purchases already filed that have not yet reached MIN_HORIZON_DAYS. */
  queued: number;
  rateWeekly: number;
  /** ISO date, or null when the cell is receiving no filings. */
  clearsOn: string | null;
  /** True when the queue alone carries the cell over the floor: the date is
   *  then a maturation date rather than a projection. */
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
  /** Null below MIN_CELL: not stated, rather than unknown. Ratios. */
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
  arrivalsWeekly: number;
}

export interface MissingCell extends Clearance {
  id: string;
  label: string;
  n: number;
}

export type StudyVerdict =
  | { state: "waiting"; missing: MissingCell[] }
  | {
      state: "open";
      p: number;
      gap: number;
      leader: string | null;
      neededPerCell: number | null;
    }
  | {
      state: "answered";
      p: number;
      gap: number;
      leader: string;
      trailer: string;
    };

export interface StudyResult {
  slug: string;
  market: StudyMarket;
  computedOn: string;
  asOf: string | null;
  universe: StudyUniverse;
  cells: StudyCell[];
  compareIds: string[];
  verdict: StudyVerdict;
}

export declare function computeStudy(
  study: Study,
  dealings: StudyRow[] | null | undefined,
  market: StudyMarket,
  today?: Date | string,
): StudyResult;

export declare function pct(ratio: number | null | undefined): string;
export declare function signedPp(ratio: number | null | undefined): string;
export declare function verdictHeadline(result: StudyResult): string;
export declare function verdictDetail(
  result: StudyResult,
  market: StudyMarket,
): string;
export declare function stateLabel(result: StudyResult): string;
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
  line: string;
}

export declare function citation(
  study: Study,
  result: StudyResult,
  host: string,
  accessed: Date | string,
): Citation;
