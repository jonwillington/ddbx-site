// Types for shared/congress.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

import type {
  GovChamber,
  GovDealing,
  GovMemberProfile,
  GovMemberSummary,
  SectorNormalized,
} from "../src/types/ddbx";

/** One modelled committee, as /api/gov-committees returns it. */
export interface CommitteeLane {
  committee: string;
  sectors: SectorNormalized[];
  member_count: number;
}

export declare const MIN_MEMBER_FILINGS: number;
export declare const MIN_COMMITTEE_MEMBERS: number;
export declare const MEMBER_ROWS: number;
export declare const COMMITTEE_ROWS: number;
export declare const CONGRESS_NOTICE: string;
export declare const CONGRESS_SOURCE: string;

export declare function memberSlug(name: string, bioguide: string): string;
export declare function bioguideFromSlug(slug: string): string | null;
export declare function memberPath(slug: string): string;
export declare function memberPathFor(m: {
  name: string;
  id: string;
}): string;

export declare function committeeSlug(committee: string): string;
export declare function committeePath(slug: string): string;
export declare function shortCommittee(committee: string): string;

export declare function usd(n: number): string;
export declare function band(min: number, max: number): string;
export declare function seat(m: {
  party?: string;
  state?: string;
  district?: number;
}): string;
export declare function chamberLabel(c: GovChamber): string;
export declare function memberNoun(c: GovChamber): string;

export declare function memberLeadSentence(m: GovMemberSummary): string;
/** Null when `stats.jurisdiction_modelled` is false — the caller must render
 *  `unmodelledLaneNote` instead. Never returns a "0 in lane" string for a
 *  member whose committees we do not map. */
export declare function laneSentence(m: GovMemberSummary): string | null;
export declare function unmodelledLaneNote(m: GovMemberSummary): string;
export declare function bulkNote(m: GovMemberSummary): string | null;
export declare function concentrationNote(m: GovMemberSummary): string | null;
export declare function lateNote(m: GovMemberSummary): string | null;
export declare function advisorNote(
  profile: GovMemberProfile | undefined,
): string | null;
export declare function ownerNote(m: GovMemberSummary): string | null;
export declare function committeeLeadSentence(
  c: CommitteeLane,
  members: GovMemberSummary[],
): string;
export declare function listSentence(items: string[]): string;

export declare function memberMeetsBar(m: GovMemberSummary | null): boolean;
export declare function committeeMeetsBar(
  members: GovMemberSummary[],
): boolean;
export declare function membersOnCommittee(
  members: GovMemberSummary[],
  committee: string,
): GovMemberSummary[];

/** Re-exported for consumers that need the wire row type alongside these. */
export type { GovDealing, GovMemberSummary };

export declare function bulkTag(m: GovMemberSummary): string | null;
