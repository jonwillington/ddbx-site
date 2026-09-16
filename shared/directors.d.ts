// Types for shared/directors.js. See shared/seo.d.ts for why the module is
// plain ESM with its types declared alongside.

/** A row of GET /api/directors-index — one PERSON, spellings already pooled.
 *  Mirrors `DirectorIndexRow` in src/types/ddbx.ts, which is the canonical
 *  copy; this declaration exists so the Functions and the app agree about the
 *  shape the bar is applied to. */
export interface DirectorIndexEntry {
  id: string;
  name: string;
  company: string;
  ticker: string;
  buys: number;
  resolved: number;
  first_disclosed: string;
  last_disclosed: string;
  spellings: number;
}

/** What the pre-render passes the shared sentences: the detail response
 *  flattened onto the directory's field names, so one bar reads both shapes. */
export interface DirectorBarInput {
  name?: string;
  company?: string;
  buys?: number;
  resolved?: number;
}

export const MIN_DIRECTOR_BUYS: number;
export const MIN_DIRECTOR_RESOLVED: number;
export const MIN_RESOLVED_FOR_RATE: number;
export const DIRECTORS_INDEX_PATH: string;
export const DIRECTOR_ROWS: number;
export const INDEX_ROWS: number;

export function directorMeetsBar(d: DirectorBarInput | null | undefined): boolean;
export function directorPath(id: string, market?: string): string;
export function companySlug(ticker: string): string;
export function directorLeadSentence(d: DirectorBarInput | null | undefined): string;
export function directorRateSentence(
  d: DirectorBarInput | null | undefined,
): string | null;
