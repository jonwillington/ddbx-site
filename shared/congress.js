// Congress member and committee pages: slugs, publishing bars, the band
// vocabulary, and the sentences both renderers produce.
//
// Plain ESM at the repo root for the usual reason — src/pages/congress-*.tsx
// and functions/congress/**/*.js both need it and neither can import the
// other's module graph.
//
// ---------------------------------------------------------------------------
// What these pages are, and the two rules that govern every line on them
// ---------------------------------------------------------------------------
//
// These are pages about named, living public officials, built from legally
// mandated disclosures. That makes them the highest-consequence pages on the
// site: a company page that overstates something is wrong, and a page about a
// sitting legislator that overstates something is an accusation. Two rules
// follow, and everything in this file exists to enforce one of them.
//
// RULE 1 — BANDS, NEVER POINTS.
// A PTR discloses a range ("$1,001 - $15,000"), not an amount. The wire format
// carries `amount_mid` for sorting and it must never reach a reader as a value.
// So there is no formatter here that takes a midpoint, and the totals we render
// are `total_min`-to-`total_max` pairs. If you find yourself wanting a single
// figure for a headline, the honest headline is the range.
//
// RULE 2 — DISTINGUISH WHAT WE DON'T MODEL FROM WHAT DIDN'T HAPPEN.
// The rating engine models committee jurisdiction for House committees only
// (11 of them; see /api/gov-committees). For a senator, `in_lane_count` is 0
// because the question was never asked. Rendering "0 of their purchases were in
// their lane" for a senator states a fact about our coverage as a fact about a
// person. `stats.jurisdiction_modelled` is the guard and `laneSentence()` below
// is the only place allowed to phrase it.
//
// A third rule with no code to enforce it, so it is written here instead: the
// in-lane fact is about JURISDICTION, never about knowledge. "Sits on a
// committee overseeing the sector" is publishable. "Traded on information from
// that committee" is not, and nothing on these pages may imply it. The
// generated `rating_explain` factors already observe this; hand-written copy
// has to match them.

/** A member needs this many DISTINCT FILINGS to get an indexable page.
 *
 *  Filings, not rows: one PTR carrying 320 lines is one disclosure event, and a
 *  row bar would admit a member we have seen exactly once. At 3 the current
 *  roster publishes 33 of 75 members. The rest still render — a link must not
 *  404 — with noindex and no sitemap entry, and cross the bar on their own as
 *  filings arrive, exactly like the company content bar. */
export const MIN_MEMBER_FILINGS = 3;

/** A committee page needs this many tracked members before it says anything
 *  about "the committee". Below it the page is three names and a table. */
export const MIN_COMMITTEE_MEMBERS = 3;

/** Cap on the filings table. The member board is evidence under the rollup, not
 *  an archive; the rollup above it always covers every row. */
export const MEMBER_ROWS = 40;

/** Cap on a committee page's recent-activity board. */
export const COMMITTEE_ROWS = 25;

/* ─── Slugs ──────────────────────────────────────────────────────────────── */

/** Name for humans and for the query, bioguide for identity.
 *
 *  Both halves are load-bearing. Names collide (there have been two Congress
 *  members named Mike Rogers serving simultaneously) and they change, so a
 *  name-only slug is neither unique nor stable. A bioguide-only slug is stable
 *  and unique and tells a reader nothing, and the query we want to rank for is
 *  the member's name. Carrying both means the id resolves the page and the name
 *  is free to change without breaking a link. */
export function memberSlug(name, bioguide) {
  const stem = String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/[.,']/g, "")             // "Jr." -> "jr", "O'Brien" -> "obrien"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${stem}-${String(bioguide ?? "").toLowerCase()}`;
}

/** The bioguide out of a slug, or null.
 *
 *  Reads the LAST hyphenated segment and validates the bioguide shape (one
 *  letter, six digits) rather than trusting position alone — otherwise
 *  "/congress/members/nancy-pelosi" would resolve "pelosi" as an id and 404
 *  with a confusing message instead of a clean not-found. */
export function bioguideFromSlug(slug) {
  const last = String(slug ?? "").split("-").pop() ?? "";

  return /^[a-z]\d{6}$/i.test(last) ? last.toUpperCase() : null;
}

export const memberPath = (slug) => `/congress/members/${slug}`;
export const memberPathFor = (m) => memberPath(memberSlug(m.name, m.id));

/** Committees are slugged from the name with the chamber prefix dropped: the
 *  pages are House-only (that is what the jurisdiction map covers), so
 *  "house-committee-on-financial-services" spends four segments saying nothing.
 *  Both the site and the sitemap derive slugs through here, so they cannot
 *  disagree. */
export function committeeSlug(committee) {
  return String(committee ?? "")
    .replace(/^(House|Senate)\s+Committee\s+on\s+/i, "")
    .replace(/^Permanent\s+Select\s+Committee\s+on\s+/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const committeePath = (slug) => `/congress/committees/${slug}`;

/** Display form. The full name is correct and long; lists and chips get the
 *  short one, headings and the first mention get the full one. */
export function shortCommittee(committee) {
  return String(committee ?? "")
    .replace(/^House\s+Committee\s+on\s+/i, "")
    .replace(/^Senate\s+Committee\s+on\s+/i, "")
    .replace(/^Permanent\s+Select\s+Committee\s+on\s+/i, "");
}

/* ─── Bands and formatting ───────────────────────────────────────────────── */

/** USD, no decimals, compact above a million.
 *
 *  Bands are wide — a member's floor-to-ceiling range routinely spans an order
 *  of magnitude — so precision to the dollar on a $23,850,000 ceiling is false
 *  confidence about a number that is itself the top of a range. */
export function usd(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `$${m >= 100 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

/** The band, as a reader should ever see a PTR total: floor to ceiling.
 *
 *  THE ONLY TOTAL FORMATTER IN THIS FILE, deliberately. There is no
 *  `formatAmount(mid)` to reach for. */
export function band(min, max) {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  if (!lo && !hi) return "not disclosed";
  if (lo === hi) return usd(lo);
  return `${usd(lo)} to ${usd(hi)}`;
}

/** The band again, tightened for a stat tile.
 *
 *  `band()` reads correctly in a sentence and badly in a 4-column grid: "$62k
 *  to $930k" wraps onto two lines at tile width, which made the one tile
 *  carrying the headline figure taller than its neighbours. A hyphenated range
 *  fits on one line, and HOUSE_STYLE_RULES specifies plain hyphens for ranges. */
export function bandCompact(min, max) {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;

  if (!lo && !hi) return "n/a";
  if (lo === hi) return usd(lo);

  return `${usd(lo)}-${usd(hi)}`;
}

/** Party and seat, as one chip's worth of text: "R-GA-7", "D-CA", "R-OK". */
export function seat(m) {
  const parts = [m.party, m.state].filter(Boolean);
  if (m.district != null) parts.push(String(m.district));
  return parts.join("-");
}

export const chamberLabel = (c) => (c === "senate" ? "Senate" : "House");
export const memberNoun = (c) => (c === "senate" ? "Senator" : "Representative");

/* ─── The sentences ──────────────────────────────────────────────────────── */

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The member page's opening sentence, and its meta description.
 *
 *  One function so the crawler and the reader get the same sentence — the
 *  sector pages learned this the hard way, where the description existed only
 *  in the pre-render and no visitor ever saw it.
 *
 *  Leads with filings and the band because those are the facts; the lane
 *  belongs in its own sentence (see `laneSentence`) where it can be qualified. */
export function memberLeadSentence(m) {
  const s = m.stats;
  const who = `${memberNoun(m.chamber)} ${m.name}`;
  const seatBit = m.state ? ` of ${m.state}` : "";
  const rows = s.filings === s.filing_docs
    ? plural(s.filing_docs, "disclosure", "disclosures")
    : `${plural(s.filing_docs, "disclosure", "disclosures")} covering ${plural(s.filings, "purchase", "purchases")}`;

  return `${who}${seatBit} has filed ${rows} in ${plural(s.issuers, "company", "companies")}, worth ${band(s.total_min, s.total_max)} at the disclosed bands, between ${s.first_disclosed} and ${s.last_disclosed}.`;
}

/** The jurisdiction sentence, or null when we are not entitled to one.
 *
 *  RULE 2 LIVES HERE. Returning null for an unmodelled member is the point: the
 *  caller renders `unmodelledLaneNote()` instead, which describes our coverage
 *  rather than the member. Do not add a fallback that reports 0. */
export function laneSentence(m) {
  const s = m.stats;
  if (!s.jurisdiction_modelled) return null;
  if (s.in_lane_count === 0) {
    return `None of the purchases we hold are in a sector overseen by a committee they sit on.`;
  }
  const share = Math.round((s.in_lane_count / s.filings) * 100);
  // Parentheses, not a pair of em dashes. HOUSE_STYLE_RULES in
  // ddbx-data/worker/llm/prompts.ts bans the em dash outright and names
  // parentheses as the substitute. The site keeps the em dash as a TITLE
  // separator ("Technology — UK insider buying") but not inside a sentence,
  // and a double-dash parenthetical is exactly the construction the 2026-07-27
  // de-LLM sweep was aimed at.
  return `${plural(s.in_lane_count, "purchase", "purchases")} (${share}% of the total) are in a sector overseen by a committee they sit on.`;
}

/** What to say instead, when jurisdiction is unmodelled for this member.
 *
 *  Says what WE don't do, names the reason, and never implies anything about
 *  the member. Senate committees have no jurisdiction map today, so every
 *  senator lands here. */
export function unmodelledLaneNote(m) {
  return m.chamber === "senate"
    ? `We map committee jurisdiction for House committees only, so no lane is computed for senators. The filings below are complete either way.`
    : `None of this member’s committees are ones we map a sector jurisdiction for, so no lane is computed. The filings below are complete either way.`;
}

/** The bulk-filing caveat, or null when the member has none.
 *
 *  A member whose totals are dominated by one 320-line portfolio disclosure has
 *  a page that reads as 320 decisions unless it says otherwise. The pipeline
 *  already classifies these as `rebalance`; this turns that into a sentence.
 *  Every member whose bulk share is material gets it — there is no threshold at
 *  which quietly omitting it would be fine. */
export function bulkNote(m) {
  const s = m.stats;
  if (!s.bulk_filings || !s.bulk_rows) return null;
  const all = s.bulk_rows >= s.filings;
  const share = Math.round((s.bulk_rows / s.filings) * 100);
  const which = all
    ? `Every filing we hold for this member is`
    : `${plural(s.bulk_filings, "filing", "filings")}, covering ${share}% of the purchases below, ${s.bulk_filings === 1 ? "is" : "are"}`;

  return `${which} a bulk portfolio disclosure rather than a discrete decision: many holdings reported at once, typically an account-level filing. Counts and totals include them; read them as an account snapshot, not as individual choices.`;
}

/** The single-filing concentration note, or null.
 *
 *  Distinct from `bulkNote`: a filing can be huge without being classified as a
 *  rebalance. "303 of these 320 came from one filing" is worth saying either
 *  way, because the row count is otherwise read as activity over time. */
export function concentrationNote(m) {
  const s = m.stats;
  if (s.filing_docs <= 1 || !s.largest_filing_rows) return null;
  if (s.largest_filing_rows / s.filings < 0.4) return null;
  const share = Math.round((s.largest_filing_rows / s.filings) * 100);

  return `${share}% of these purchases (${s.largest_filing_rows} of ${s.filings}) came from a single filing.`;
}

/** Late-filing note, or null. Filing-level, stated, not editorialised. */
export function lateNote(m) {
  const n = m.stats.late_filings;
  if (!n) return null;

  return `${plural(n, "filing", "filings")} ${n === 1 ? "was" : "were"} submitted after the STOCK Act’s 45-day disclosure window.`;
}

/** Advisor-managed note, or null.
 *
 *  Leads the page when true. A member whose book is run under discretion has a
 *  page that would otherwise read as a series of deliberate choices they did
 *  not personally make, which is the most consequential thing this file can get
 *  wrong. `GovMemberProfile.advisor_managed` exists for exactly this. */
export function advisorNote(profile) {
  if (!profile || profile.advisor_managed !== true) return null;
  const because = profile.note ? ` ${profile.note}` : "";

  return `This member’s portfolio is reported as managed by an outside adviser with discretion, so the purchases below are not necessarily their own decisions.${because}`;
}

/** Owner-mix note, or null when every row is the member's own.
 *
 *  Spouse and dependent trades are disclosed under the member's name and are
 *  not the member's decisions. Labelled per row too; this is the summary. */
export function ownerNote(m) {
  const s = m.stats;
  const other = s.filings - s.self_count;
  if (other <= 0) return null;
  const share = Math.round((other / s.filings) * 100);

  return `${plural(other, "purchase", "purchases")} (${share}%) were filed for a spouse, joint or dependent account rather than in the member’s own name.`;
}

/** Committee page lead sentence and meta description.
 *
 *  Deliberately does NOT restate the jurisdiction. The standfirst directly
 *  above it already opens with "The House Committee on X has jurisdiction over
 *  Y", and the first draft repeated that clause here, so the page said the same
 *  thing twice in two consecutive paragraphs. The sentence has to stand alone
 *  as a meta description too, hence the committee's full name in it. */
export function committeeLeadSentence(c, members) {
  const filings = members.reduce((n, m) => n + m.stats.filing_docs, 0);
  const issuers = members.reduce((n, m) => n + m.stats.in_lane_count, 0);

  return `${plural(members.length, "member", "members")} of the ${c.committee} have disclosed stock purchases, ${plural(filings, "filing", "filings")} in total, of which ${issuers} fall in a sector the committee oversees.`;
}

/** "a, b and c" — Oxford-comma-free, matching house style. */
export function listSentence(items) {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/* ─── Bars and selection ─────────────────────────────────────────────────── */

export const memberMeetsBar = (m) =>
  !!m && m.stats.filing_docs >= MIN_MEMBER_FILINGS;

export const committeeMeetsBar = (members) =>
  members.length >= MIN_COMMITTEE_MEMBERS;

/** Members on a committee, most recently active first. */
export function membersOnCommittee(members, committee) {
  return members.filter((m) => (m.committees ?? []).includes(committee));
}

/** A three-word marker for a directory row, or null.
 *
 *  The member page gets the full `bulkNote` paragraph. A list row has no space
 *  for it and still needs it: "5 filings, 429 companies" reads as a prolific
 *  stock-picker when it is one account-level disclosure, and the directory is
 *  where most readers meet a member for the first time. */
export function bulkTag(m) {
  const s = m.stats;
  if (!s.bulk_filings || !s.bulk_rows) return null;

  return s.bulk_rows >= s.filings
    ? "bulk account filings"
    : "includes bulk filings";
}

/** The standing disclaimer. One sentence, on every page in the family, in the
 *  body rather than a footnote — it is the frame the page should be read in,
 *  not small print under it. */
export const CONGRESS_NOTICE =
  "Congressional filings disclose a value band, never an exact amount, and cover the member plus their spouse and dependants. Sitting on a committee that oversees a sector is a matter of public record; it is not evidence that any purchase was informed by it.";

/** Source attribution. Public-domain portraits, public filings. */
export const CONGRESS_SOURCE =
  "Filings from the House Clerk and Senate Office of Public Records. Member portraits are public-domain congressional photographs.";
