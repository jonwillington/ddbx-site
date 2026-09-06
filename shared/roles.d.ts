// Types for shared/roles.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

import type { Dealing, UsDealing } from "../src/types/ddbx";

export type RoleMarket = "UK" | "US";
export type RoleFiling = Dealing | UsDealing;

export interface RoleEntry {
  slug: string;
  label: string;
  plural: string;
  /** Used attributively — "purchases by <noun>". */
  noun: string;
  /** Markets the bucket is published on. `chair` and
   *  `non-executive-director` are UK-only; see the module header. */
  markets: RoleMarket[];
  blurb: string;
  /** The rule the page prints, next to the code that enforces it. */
  definition: string;
}

export declare const MIN_FILINGS: number;
/** The floor on MARKED purchases, for ranking groups on their median mark.
 *  Separate from MIN_FILINGS: it gates a different quantity. */
export declare const MIN_MARKED: number;
export declare const TOP_FILINGS: number;
export declare const TOP_COMPANIES: number;
export declare const ROLES: RoleEntry[];
export declare const ROLE_SLUGS: string[];
export declare const METHODOLOGY: string[];

export declare function roleBySlug(
  slug: string | null | undefined,
): RoleEntry | null;
export declare function rolePath(slug: string): string;
export declare function rolesForMarket(market: RoleMarket): RoleEntry[];

/** Buckets are NON-EXCLUSIVE — a non-executive chair is in two of them. A
 *  connected-party filing returns `closelyAssociated` and no buckets at all. */
export declare function classifyRole(role: string | null | undefined): {
  closelyAssociated: boolean;
  buckets: string[];
};

export declare function filedRole(
  d: RoleFiling | null | undefined,
  market: RoleMarket,
): string;

export declare function inRole(
  d: RoleFiling | null | undefined,
  market: RoleMarket,
  slug: string,
): boolean;

/** The four counts sum to the corpus. The per-bucket counts do not. */
export declare function roleCoverage(
  dealings: RoleFiling[] | null | undefined,
  market: RoleMarket,
): {
  total: number;
  classified: number;
  closelyAssociated: number;
  unbucketed: number;
  missing: number;
};

/** What `roleCoverage.missing` means on this market — a gap in the UK filing,
 *  a non-officer filer on the US one. */
export declare function missingRoleLabel(market: RoleMarket): string;
