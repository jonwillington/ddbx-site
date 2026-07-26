// Types for shared/glossary.js. See shared/seo.d.ts for why the module is
// plain ESM with its types declared alongside.

export type GlossaryOwner = "uk" | "us";
/** Which live feed an entry appends real examples from, if any. */
export type GlossaryLiveData = "clusters" | "open-market" | "recent" | null;

export interface GlossaryEntry {
  slug: string;
  /** The single host that publishes this entry — see the header in the .js. */
  owner: GlossaryOwner;
  term: string;
  title: string;
  description: string;
  liveData: GlossaryLiveData;
  liveHeading?: string;
  /** One string per paragraph. */
  body: string[];
  related: string[];
  /** Overrides the generated install CTA at the foot of the entry. Set where a
   *  term-specific line sells harder than the default built from `term` — a
   *  closed-period entry saying "know the moment the window reopens" beats
   *  "stop reading about a closed period". */
  cta?: { headline: string; body: string };
  /** Noun substituted into the default CTA headline when `term` doesn't read
   *  naturally in "Stop reading about {x}." */
  ctaTerm?: string;
  /** App screenshot shown beside the CTA. Defaults to the analysis screen. */
  ctaSlot?: "today" | "alert" | "analysis" | "balance" | "recap" | "cluster";
}

export declare const OWNER_HOST: Record<GlossaryOwner, string>;
export declare const ENTRIES: GlossaryEntry[];
export declare const ENTRY_SLUGS: string[];
export declare function entryBySlug(slug: string): GlossaryEntry | null;
export declare function learnPath(slug?: string | null): string;
export declare function ownerForHost(host: string): GlossaryOwner | null;
export declare function entriesForHost(host: string): GlossaryEntry[];
export declare function canonicalUrlForEntry(
  entry: GlossaryEntry | null,
): string | null;
