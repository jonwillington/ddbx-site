// Weekly digest pages: the URL shape, the labels, and the sentences both
// renderers produce.
//
// Plain ESM at the repo root, same reason as shared/months.js next to it.
//
// ---------------------------------------------------------------------------
// Why this family exists, and why it was nearly free
// ---------------------------------------------------------------------------
//
// /api/weekly-digest has been producing a fully-authored editorial object every
// week — typed cards with an eyebrow, a headline, a subhead and the stats
// behind them ("£3.87m of insider buying", "Industrials took 44% of the week's
// buying", "Evangelos Mytilineos, Chair at Metlen Energy & Metals bought
// £533k") — and none of it had a URL. That is exactly where the monthly reports
// were before /reports and /reports/:month, and this is the same fix.
//
// ---------------------------------------------------------------------------
// Two decisions worth not re-litigating
// ---------------------------------------------------------------------------
//
// 1. NO UNDATED "CURRENT WEEK" PAGE. The obvious shape is /weekly for this week
//    plus /weekly/:week for the archive, mirroring /biggest-buys. It does not
//    work here: the leaderboard's undated page and its year pages hold
//    genuinely different content, whereas /weekly and /weekly/2026-07-27 would
//    be byte-identical for seven days and then swap. Folding one onto the other
//    needs the edge to know which week is current, which changes weekly and is
//    a canonical that silently rots.
//
//    So /weekly is the ARCHIVE INDEX (a list, genuinely different content) and
//    every week including the current one lives at its own dated URL. Same
//    shape as /reports + /reports/:month, which is already proven in this repo.
//
// 2. SLUGGED ON THE WEEK-START DATE, not an ISO week number. "2026-W31" reads
//    well and is a bug farm: ISO-8601 week-numbering years diverge from
//    calendar years at both ends of December, so 2026-12-28 is in week 1 of
//    2027 and any naive `${year}-W${week}` is wrong for a few days a year, in
//    a URL that is supposed to be permanent. The API keys on week_start; so
//    does the URL.

/** Monday of the week containing `iso`. The API normalises whatever it is
 *  given, but the site derives links from stored week starts, so this is only
 *  needed for input validation. */
export function weekStartOf(iso) {
  const d = new Date(`${iso}T00:00:00Z`);

  if (Number.isNaN(d.getTime())) return null;
  // getUTCDay: 0 = Sunday. Shift so Monday is 0.
  const offset = (d.getUTCDay() + 6) % 7;

  d.setUTCDate(d.getUTCDate() - offset);

  return d.toISOString().slice(0, 10);
}

/** "2026-07-27" -> true. Rejects anything that is not a real date. */
export const isWeekSlug = (slug) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(slug ?? "")) &&
  weekStartOf(String(slug)) === String(slug);

export const weekPath = (weekStart) => `/weekly/${weekStart}`;

/** "/weekly/2026-07-27" -> "2026-07-27", or null. Returns null for a date that
 *  is not a Monday, so a mid-week date is a clean not-found rather than a page
 *  that silently shows a different week than the URL names. */
export function weekFromPath(path) {
  const m = String(path ?? "").match(/^\/weekly\/([^/]+)$/);

  if (!m) return null;
  const slug = decodeURIComponent(m[1]);

  return isWeekSlug(slug) ? slug : null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const dayOf = (iso) => Number(String(iso).slice(8, 10));
const monthOf = (iso) => MONTHS[Number(String(iso).slice(5, 7)) - 1] ?? "";
const yearOf = (iso) => String(iso).slice(0, 4);

/** "27 to 31 July 2026", collapsing the repeated month and year. */
export function weekLabel(start, end) {
  if (!start) return "";
  if (!end || end === start) return `${dayOf(start)} ${monthOf(start)} ${yearOf(start)}`;

  const sameMonth = monthOf(start) === monthOf(end) && yearOf(start) === yearOf(end);

  return sameMonth
    ? `${dayOf(start)} to ${dayOf(end)} ${monthOf(end)} ${yearOf(end)}`
    : `${dayOf(start)} ${monthOf(start)} to ${dayOf(end)} ${monthOf(end)} ${yearOf(end)}`;
}

/** Short form for a list row: "27 Jul". */
export const weekShort = (start) =>
  `${dayOf(start)} ${monthOf(start).slice(0, 3)}`;

/** The `week_in_numbers` card, which every digest leads with. Null when a week
 *  somehow lacks one, so callers fall back rather than reading `.stats` off
 *  undefined. */
export const numbersCard = (digest) =>
  (digest?.cards ?? []).find((c) => c.kind === "week_in_numbers") ?? null;

/** The week page's opening sentence, and its meta description.
 *
 *  Built from the digest's own numbers card rather than restating its headline,
 *  which is already rendered a few pixels away as the headline. */
export function weekLeadSentence(digest, marketLabel) {
  const s = numbersCard(digest)?.stats;

  if (!s) {
    return `Insider buying disclosed in ${marketLabel} during the week of ${weekLabel(digest?.week_start, digest?.week_end)}.`;
  }

  return `${s.buy_count} disclosed insider ${s.buy_count === 1 ? "purchase" : "purchases"} across ${s.company_count} ${s.company_count === 1 ? "company" : "companies"}, from ${s.insider_count} ${s.insider_count === 1 ? "insider" : "insiders"}, in the ${marketLabel} week of ${weekLabel(digest?.week_start, digest?.week_end)}.`;
}

/** Index lead sentence.
 *
 *  Ranges by MONTH, not by week label. Spelling both endpoints out in full
 *  produced "from 9 to 13 March 2026 to 27 to 31 July 2026" — four dates and
 *  three uses of "to" in one clause, where the reader only wants to know how
 *  far back the archive goes. */
export function archiveLeadSentence(weeks, marketLabel) {
  if (!weeks?.length) return `Weekly ${marketLabel} insider-buying digests.`;
  const buys = weeks.reduce((n, w) => n + (w.buy_count ?? 0), 0);
  const first = weeks[weeks.length - 1].week_start;
  const last = weeks[0].week_end || weeks[0].week_start;
  const span =
    monthOf(first) === monthOf(last) && yearOf(first) === yearOf(last)
      ? `${monthOf(last)} ${yearOf(last)}`
      : yearOf(first) === yearOf(last)
        ? `${monthOf(first)} to ${monthOf(last)} ${yearOf(last)}`
        : `${monthOf(first)} ${yearOf(first)} to ${monthOf(last)} ${yearOf(last)}`;

  return `${weeks.length} ${weeks.length === 1 ? "week" : "weeks"} of ${marketLabel} insider buying, ${buys} disclosed purchases in total, covering ${span}.`;
}

/** A week with no digest row was never publishable — buildWeeklyDigest returns
 *  null for a week with nothing worth saying, so the stored set IS the bar and
 *  there is no second threshold to apply here. Kept as a named function so the
 *  page, the pre-render and the sitemap all say so in the same place. */
export const weekMeetsBar = (digest) => !!digest && (digest.cards?.length ?? 0) > 0;
