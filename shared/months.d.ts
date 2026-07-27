// Types for shared/months.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

export declare const MONTH_NAMES: string[];
export declare function monthLabel(month: string | null | undefined): string;
export declare function monthShort(month: string | null | undefined): string;
export declare function monthSlug(month: string | null | undefined): string;
export declare function slugToMonth(
  slug: string | null | undefined,
): string | null;
export declare function reportPath(month: string | null | undefined): string;
export declare const REPORT_CONTENTS: {
  label: string;
  description: string;
}[];
