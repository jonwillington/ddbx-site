// Sector standing and peers for a company page.
//
// Plain ESM at the root, imported by both src/pages/company.tsx and
// functions/company/[key].js, for the reason shared/seo.js is: one set of
// facts, two renderers, and a crawler that reads a different peer list from
// the visitor is a page arguing with itself.
//
// ---------------------------------------------------------------------------
// Why this exists
// ---------------------------------------------------------------------------
//
// 368 company pages are live and indexable and most of them are thin — an
// issuer with one disclosed purchase gets one table row, a paragraph of Yahoo
// boilerplate and a stats grid. Both the 2026-07-26 and 2026-08-02 plans logged
// that as the largest thin-content exposure on the site and neither resolved
// it, because the two obvious answers are both bad: noindexing 368 live URLs
// throws away real pages, and padding them with generated prose is the thing
// helpful-content demotion exists to catch.
//
// The third answer is to say something true and specific that the page does not
// currently say. A single-filing issuer still has a sector, still sits
// somewhere in that sector's disclosed buying, and still has peers a reader
// would want next. None of that is padding — it is the context that makes one
// filing legible, and it is all derived from the same twelve-month window the
// sector hubs and the boards already read.
//
// The bar is the one the rest of the site applies: state nothing we cannot
// compute. Every field below is nullable and the renderers drop the section
// rather than print a placeholder.

import { dealValue, sectorByLabel } from "./sectors.js";
import { isEligibleBuy } from "./leaderboard.js";

/** Peers listed on a company page. Enough to be useful, short enough that the
 *  section stays a pointer rather than becoming a second directory. */
export const MAX_PEERS = 6;

/** The sector a company's own filings put it in.
 *
 *  Read from the company's OWN rows rather than from a lookup, because that is
 *  the only place the site has it: `/api/companies` carries no sector and
 *  `/api/company/:market/:key/page` carries no `sector_normalized` either. Every
 *  dealing does.
 *
 *  Takes the modal value rather than the first. A handful of issuers carry
 *  different sector labels across their rows — a re-classification landing
 *  mid-window — and picking whichever happened to sort first would make the
 *  page's sector flip between renders. */
export function sectorForDeals(deals) {
  const counts = new Map();

  for (const d of deals ?? []) {
    const label = d?.sector_normalized;

    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  if (counts.size === 0) return null;

  let best = null;
  let bestCount = 0;

  for (const [label, n] of counts) {
    // Ties break alphabetically so the choice is stable across renders.
    if (n > bestCount || (n === bestCount && label < best)) {
      best = label;
      bestCount = n;
    }
  }

  return sectorByLabel(best);
}

/** Where this issuer sits in its sector's disclosed buying, and who its peers
 *  are.
 *
 *  `window` is the same twelve-month dealings feed the sector hubs read.
 *  Returns null when there is nothing honest to say — no sector on the
 *  company's rows, or a window we could not load. A null here means the
 *  renderers omit the section, which is the correct behaviour: an empty
 *  "context" block that says nothing is worse than no block.
 *
 *  `rank` and `total` describe the issuer's standing among sector peers BY
 *  DISCLOSED VALUE, and both are only reported when this issuer is actually in
 *  the window. A company whose only filing predates the window would otherwise
 *  be ranked "last of 40" on the strength of not being counted. */
export function sectorStanding(deals, windowDeals, market, ownKey) {
  const sector = sectorForDeals(deals);

  if (!sector) return null;

  const inSector = (windowDeals ?? []).filter(
    (d) =>
      isEligibleBuy(d, market) && d?.sector_normalized === sector.label,
  );

  if (inSector.length === 0) return null;

  const byIssuer = new Map();

  for (const d of inSector) {
    const key = issuerKeyFor(d, market);

    if (!key) continue;
    const row = byIssuer.get(key) ?? {
      key,
      ticker: d.ticker ?? key,
      company: d.company ?? d.ticker ?? key,
      filings: 0,
      value: 0,
    };

    row.filings += 1;
    row.value += dealValue(d);
    byIssuer.set(key, row);
  }

  const ranked = [...byIssuer.values()].sort(
    (a, b) => b.value - a.value || b.filings - a.filings,
  );

  // Match on the ticker as well as the grouping key, because on US they are
  // different things. Rows are grouped by `issuer_cik` (EDAP files under two
  // tickers on one CIK) while the company page is keyed on the TICKER, so
  // comparing a CIK against "AMRZ" never matched: every US page reported no
  // rank, and listed itself among its own peers.
  const own = String(ownKey ?? "").toUpperCase();
  const isSelf = (r) =>
    r.key.toUpperCase() === own || tickerKey(r.ticker) === tickerKey(ownKey);
  const index = ranked.findIndex(isSelf);

  return {
    sector,
    /** Issuers in this sector with disclosed buying in the window. */
    companies: ranked.length,
    filings: inSector.length,
    value: inSector.reduce((sum, d) => sum + dealValue(d), 0),
    /** 1-based, or null when this issuer has no filing inside the window. */
    rank: index >= 0 ? index + 1 : null,
    peers: peersAround(ranked, index, isSelf),
  };
}

/** The issuers NEAREST this one in the sector ranking, not the sector's
 *  biggest.
 *
 *  Taking the top six looks reasonable and is quietly the same bug this whole
 *  file exists to fix. UK industrials holds 154 issuers; every one of those 154
 *  pages would carry an identical list of the sector's six largest, so the
 *  enrichment meant to make thin pages specific would instead stamp the same
 *  block across a third of the site — which is what helpful-content demotion
 *  looks for.
 *
 *  Neighbours make each page's list its own and answer a better question:
 *  companies with a comparable amount of disclosed buying, which is what a
 *  reader on this page is placed to compare. An unranked issuer (no filing
 *  inside the window) has no neighbourhood, so it falls back to the sector's
 *  most active — for that page the top six genuinely is the useful list. */
function peersAround(ranked, index, isSelf) {
  const others = ranked.filter((r) => !isSelf(r));

  if (index < 0) return others.slice(0, MAX_PEERS);

  const half = Math.floor(MAX_PEERS / 2);
  // Slide the window when the issuer sits near either end, so a rank-1 company
  // still gets six names rather than three.
  const start = Math.max(0, Math.min(index - half, others.length - MAX_PEERS));

  return others.slice(Math.max(0, start), Math.max(0, start) + MAX_PEERS);
}

/** Ticker, normalised for comparison. UK company keys carry the ".L" suffix in
 *  some places and not others, so a bare string compare misses. */
function tickerKey(t) {
  return String(t ?? "")
    .toUpperCase()
    .replace(/\.L$/, "")
    .trim();
}

/** Issuer identity, per market. US uses the CIK for the same reason
 *  shared/boards.js does — EDAP TMS files under two tickers on one CIK. The
 *  company page is keyed on the ticker though, so the ticker is kept alongside
 *  for display, for the peer links, and for the self-match above. */
function issuerKeyFor(d, market) {
  if (market === "US") return d?.issuer_cik || d?.ticker || "";

  return d?.ticker || "";
}

/** One sentence placing the issuer in its sector, or null.
 *
 *  Deliberately not templated over a rank when there isn't one. Three different
 *  true sentences rather than one sentence with holes in it, because the holes
 *  are exactly where a page starts claiming things. */
export function standingSentence(standing, market) {
  if (!standing) return null;
  const { sector, companies, rank } = standing;
  const noun = market === "US" ? "insiders" : "directors";
  const others = companies - 1;

  if (rank == null) {
    // STATE THE SECTOR FACT, CLAIM NO REASON. An issuer can be absent from the
    // ranking because its filings predate the window OR because none of them
    // clear the eligibility test — and the two are indistinguishable from here.
    // An earlier draft said peers "have seen disclosed buying more recently",
    // which put Republic Services on a page listing 39 purchases underneath a
    // sentence implying it had none: all 39 are its 10% holder, excluded by
    // isEligibleBuy but still counted in the API summary the tiles render.
    // Two true facts side by side beat one sentence guessing at the link.
    return `${companies} ${sector.label.toLowerCase()} ${companies === 1 ? "company has" : "companies have"} had ${noun} buy in the last twelve months.`;
  }

  if (others <= 0) {
    return `It is the only ${sector.label.toLowerCase()} company where ${noun} have disclosed a purchase in the last twelve months.`;
  }

  return `By value disclosed, that ranks ${ordinal(rank)} of the ${companies} ${sector.label.toLowerCase()} companies where ${noun} bought in the last twelve months.`;
}

function ordinal(n) {
  const rem100 = n % 100;

  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** How the buying at this issuer was spread over time, or null when there is
 *  only one filing and therefore no cadence to describe.
 *
 *  A single purchase is the common case on the thin pages, and "1 purchase over
 *  0 days" is the kind of computed-from-nothing figure the static-page rules
 *  ban outright. */
export function cadence(summary) {
  const deals = Number(summary?.deals ?? 0);
  const first = summary?.first_trade_date;
  const last = summary?.last_trade_date;

  if (!(deals > 1) || !first || !last) return null;

  const days = Math.round(
    Math.abs(Date.parse(last) - Date.parse(first)) / 86_400_000,
  );

  if (!isFinite(days)) return null;

  return { deals, days, people: Number(summary?.people ?? 0) || null };
}

export function cadenceSentence(c, market) {
  if (!c) return null;
  const noun = market === "US" ? "insiders" : "directors";

  const span =
    c.days === 0
      ? "on the same day"
      : c.days < 31
        ? `over ${c.days} days`
        : c.days < 365
          ? `over ${Math.round(c.days / 30)} months`
          : `over ${(c.days / 365).toFixed(1)} years`;

  if (c.people && c.people > 1) {
    return `${c.deals} purchases by ${c.people} different ${noun}, ${span}.`;
  }

  return `${c.deals} purchases ${span}, all by the same person.`;
}
