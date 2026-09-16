// Types for shared/us-names.js. See shared/seo.d.ts for why the module is
// plain ESM with its types declared alongside.

/** True when an EDGAR reporter name looks like an organisation rather than a
 *  natural person. Tested from the second token on, because a person's surname
 *  leads and words like "Holding" are surnames. */
export function isEntityName(raw: string): boolean;

/** "HOLDING FRANK B JR" -> "Frank B Holding Jr". Returns the name as filed
 *  (recased only if it was shouted) whenever the order cannot be read
 *  confidently — a compound surname, three or more forenames, or an
 *  organisation. */
export function usInsiderDisplayName(raw: string): string;

/** Title-case a value that is already in reading order but was filed in caps —
 *  an EDGAR issuer name. Leaves mixed-case input untouched. */
export function recaseIfShouted(raw: string): string;
