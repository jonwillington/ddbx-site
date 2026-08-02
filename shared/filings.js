// Per-filing pages: the URL shape, the publishing bar, and the sentences both
// renderers produce for one disclosure.
//
// Plain ESM at the repo root, same reason as shared/sectors.js and
// shared/congress.js: src/pages/filing.tsx and functions/dealings/[id].js both
// need it and neither can import the other's module graph.
//
// ---------------------------------------------------------------------------
// What these pages publish, and what they deliberately do not
// ---------------------------------------------------------------------------
//
// THIS IS THE FILE WHERE THE DISCRETION-MODE BOUNDARY IS DECIDED, so the
// reasoning lives here rather than in a commit message nobody re-reads.
//
// The site's whole product posture (see src/lib/discretion.ts and the repo
// CLAUDE.md) is that the app is the canonical surface and the web shows a
// sliver. A public page carrying the full written analysis of a disclosure
// would hand away exactly the thing the app is for.
//
// The obvious workaround — show a crawler the analysis and a visitor a blur —
// is cloaking, and it is the one SEO mistake that gets a domain penalised
// rather than just outranked. So it is not available, and the boundary has to
// be one we are happy for BOTH to see.
//
// What these pages publish:
//   - the disclosure facts (who, what role, how many shares, at what price,
//     what it cost, traded when, disclosed when, how many days apart). All of
//     this is public record in the RNS or the Form 4 already.
//   - the rating and its confidence, and the six-point checklist behind it,
//     with each check's own explanation and, where it passed, what we found
//     for THIS filing (shared/methodology.js owns that copy).
//     The method is already published in full at /how-it-works, so the
//     per-filing OUTCOME of that method gives nothing away that the method
//     page does not.
//   - the derived context: cluster, buy style, accumulation run.
//   - what happened next: return and alpha from the disclosure-day close.
//   - the sources the analysis cited. Those are third-party URLs; the writing
//     about them is ours, the links are not.
//
// What they do not publish: `analysis.thesis_points`, the `detail` field on
// every evidence point, `key_risks`, and `analysis.summary`. The first three
// are the product. The fourth is excluded for a separate and more interesting
// reason (see `filingLeadSentence`).
//
// This matches the precedent already set by /company/:key, which publishes
// deal facts and a rating badge and no analysis body. It was not invented
// here.

/* ─── The bar ────────────────────────────────────────────────────────────── */

/** A filing gets an indexable page only if it carries a written analysis.
 *
 *  This is deliberately not a tuned heuristic. The question a content bar is
 *  trying to answer is "does this page contain anything a person wrote", and
 *  for this family the data model answers it exactly: an analysed row has been
 *  through the full pipeline and has a rating, a checklist and cited sources
 *  behind it; an unanalysed one is four numbers and a name.
 *
 *  921 rows clear it across all markets today (from /api/coverage), against
 *  ~23,000 disclosures. That ratio is the point: the family cannot become a
 *  thin-content problem by growing, because it only grows when the analysis
 *  does.
 *
 *  Unanalysed filings still RENDER at their URL — a link must never 404 — with
 *  noindex and no sitemap entry, and become indexable on their own if an
 *  analysis lands later, with no code change. */
export function filingMeetsBar(d) {
  return !!d?.analysis?.rating;
}

/* ─── URLs ───────────────────────────────────────────────────────────────── */

/** Dealing ids are already opaque and stable ("d-c43ea156ac034388"), so the
 *  path is the id and nothing else.
 *
 *  No name or ticker in the slug, unlike the Congress member pages. Those are
 *  entity pages whose query IS the person's name; this is an event page, and
 *  "hercules-plc-ceo-buys-49k-d-1825cd" would be a slug that has to change
 *  whenever a field it interpolates changes, for a query nobody types. */
export const filingPath = (id) => `/dealings/${id}`;

/** "/dealings/d-abc123" -> "d-abc123", or null. Validates the id shape rather
 *  than accepting any segment, so a junk path is a clean not-found instead of
 *  a wasted API call. */
export function filingIdFromPath(path) {
  const m = String(path ?? "").match(/^\/dealings\/([A-Za-z0-9_-]{4,64})$/);

  return m ? m[1] : null;
}

/* ─── Formatting ─────────────────────────────────────────────────────────── */

const SYMBOL = { GBP: "£", USD: "$", EUR: "€" };

/** Money in the filing's own major unit. */
export function money(value, currency = "GBP") {
  const sym = SYMBOL[currency] ?? "";
  const v = Math.abs(Number(value) || 0);

  if (v >= 1_000_000) {
    const m = v / 1_000_000;

    return `${sym}${m >= 100 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;

  return `${sym}${Math.round(v).toLocaleString("en-GB")}`;
}

/** Share price in the market's quoting convention.
 *
 *  UK equities quote in pence and `price_pence` is native minor units, so a US
 *  row's "pence" is really cents. Dividing by 100 and printing a currency
 *  symbol is right for both; printing "p" is right only for GBP. */
export function sharePrice(d) {
  const minor = Number(d?.price_pence) || 0;

  if (d?.currency === "GBP") return `${minor.toFixed(2)}p`;

  return `${SYMBOL[d?.currency] ?? ""}${(minor / 100).toFixed(2)}`;
}

export const shares = (n) => Number(n ?? 0).toLocaleString("en-GB");

/** Whole days between the trade and its disclosure. The lag is the single most
 *  under-reported fact about an insider filing: it is the difference between
 *  what the insider knew and what a reader could act on. */
export function disclosureLagDays(d) {
  const t = Date.parse(`${d?.trade_date}T00:00:00Z`);
  const p = Date.parse(`${d?.disclosed_date}T00:00:00Z`);

  if (!Number.isFinite(t) || !Number.isFinite(p)) return null;

  return Math.max(0, Math.round((p - t) / 86_400_000));
}

export function signedPct(pct) {
  if (pct == null || !Number.isFinite(Number(pct))) return null;
  const v = Number(pct);

  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

/* ─── The sentences ──────────────────────────────────────────────────────── */

/** The page's opening sentence, and its meta description.
 *
 *  BUILT FROM FACTS, not from `analysis.summary`, and not only because of the
 *  discretion boundary above. The generated summaries are written for a reader
 *  who is looking at the full analysis, so they refer to it: one live example
 *  reads "...The assessment below is carried forward from the 28 July purchase;
 *  nothing material has changed since." On a page with no assessment below,
 *  "the assessment below" is a dangling reference, and no amount of clause-
 *  stripping makes that safe to automate across 921 rows.
 *
 *  So the prose here is deterministic and ours. It also means the sentence
 *  cannot drift from the numbers next to it. */
export function filingLeadSentence(d) {
  const name = d?.director?.name ?? "An insider";
  const role = d?.director?.role ? `, ${d.director.role},` : "";
  const company = cleanName(d?.company) || d?.ticker || "the company";
  const lag = disclosureLagDays(d);
  // The trade date is stated either way. The first draft dropped it on
  // same-day filings ("...for £49k, disclosed the same day"), which left the
  // page's opening sentence with no date on it at all.
  const lagBit =
    lag == null
      ? ""
      : lag === 0
        ? ` on ${d.trade_date}, disclosed the same day`
        : ` on ${d.trade_date}, disclosed ${lag} ${lag === 1 ? "day" : "days"} later`;

  return `${name}${role} bought ${shares(d?.shares)} shares in ${company} for ${money(d?.value_gbp, d?.currency)}${lagBit}.`;
}

/** The performance sentence, or null when nothing has been marked yet.
 *
 *  Anchored on the DISCLOSURE-day close throughout, never the insider's own
 *  fill: the first is a price a reader could have paid, the second is not, and
 *  quoting the second is how an insider-tracking site accidentally claims a
 *  return nobody could have captured. */
export function outcomeSentence(d) {
  const lp = d?.live_performance;

  if (!lp || lp.return_pct_disclosed == null) return null;
  // Day zero is not an outcome. A filing marked on its own disclosure date
  // returns exactly 0.0% against exactly 0.0% of alpha, and rendering
  // "the shares are +0.0%, against the market +0.0%" states a result where
  // there has not yet been one. The page says so in words instead.
  if (lp.as_of && d.disclosed_date && lp.as_of <= d.disclosed_date) return null;
  const ret = signedPct(lp.return_pct_disclosed);
  const alpha = signedPct(lp.alpha_pct_disclosed);
  const asOf = lp.as_of ? ` as of ${lp.as_of}` : "";

  return alpha
    ? `Since the disclosure-day close the shares are ${ret}, against the market ${alpha}${asOf}.`
    : `Since the disclosure-day close the shares are ${ret}${asOf}.`;
}

/** True when the filing is too new to have an outcome yet. Distinguishes
 *  "nothing has happened" from "we have no mark", which are different things to
 *  tell a reader. */
export function awaitingOutcome(d) {
  const lp = d?.live_performance;

  if (!lp || lp.return_pct_disclosed == null) return false;

  return !!(lp.as_of && d.disclosed_date && lp.as_of <= d.disclosed_date);
}

/** Cluster context, or null. */
export function clusterSentence(d) {
  const c = d?.cluster;

  if (!c?.count || c.count < 2) return null;

  return `${c.count} insiders at this company bought inside a ${c.window_days}-day window, a ${c.tier} cluster.`;
}

/** Buy-style context, or null.
 *
 *  Quotes the raw numbers rather than the label alone. "Contrarian" is a word;
 *  "bought 26% below the trailing high" is the fact that earned it, and the
 *  fact is what makes the page worth citing. */
export function styleSentence(d) {
  const b = d?.buy_style;

  if (!b?.kind || b.kind === "neutral") return null;
  const off = Math.abs(Math.round((Number(b.drawdown_from_high_pct) || 0) * 100));

  return b.kind === "contrarian"
    ? `They bought into weakness: ${off}% below the trailing ${b.window_days}-day high.`
    : `They bought into strength, at or near the trailing ${b.window_days}-day high.`;
}

/** The context a check's `passLine` interpolates, pre-formatted.
 *
 *  shared/methodology.js does no number formatting on purpose — the market
 *  that owns the filing owns its currency — so this is where a UK row's pence
 *  and pounds get turned into strings. */
export function checkContext(d) {
  return {
    name: d?.director?.name ?? "The insider",
    role: d?.director?.role || undefined,
    company: cleanName(d?.company) || d?.ticker || "the company",
    price: d?.price_pence ? sharePrice(d) : null,
    value: money(d?.value_gbp, d?.currency),
  };
}

/** What the withheld assessment CONTAINS, as counts.
 *
 *  This is the page's conversion unit and the honest form of it. The written
 *  analysis stays in the app (see this file's header), but how much of it there
 *  is, and what shape it takes, is metadata rather than content — and it is far
 *  more persuasive than the sentence it replaced ("the written assessment is in
 *  the app"), because "five points for, three against, three risks" is a
 *  specific claim a reader can weigh.
 *
 *  Both the crawler and the visitor see exactly this. Nothing here reveals a
 *  word of the analysis. */
export function analysisShape(d) {
  const a = d?.analysis;

  if (!a) return null;

  return {
    thesis: a.thesis_points?.length ?? 0,
    for: a.evidence_for?.length ?? 0,
    against: a.evidence_against?.length ?? 0,
    risks: a.key_risks?.length ?? 0,
    window: a.catalyst_window ?? null,
    confidence: a.confidence == null ? null : Math.round(a.confidence * 100),
    sources: citedSources(d).length,
  };
}

/** Cited sources, deduplicated, with our written detail stripped.
 *
 *  Headline and label only. The `detail` field is the analysis; the URL is a
 *  third party's page and the headline is a description of it, which is the
 *  part it is fair to publish and useful to a reader either way. */
export function citedSources(d) {
  const all = [
    ...(d?.analysis?.evidence_for ?? []),
    ...(d?.analysis?.evidence_against ?? []),
  ];
  const seen = new Set();
  const out = [];

  for (const e of all) {
    if (!e?.source_url || seen.has(e.source_url)) continue;
    seen.add(e.source_url);
    out.push({
      headline: e.headline,
      label: e.source_label,
      url: e.source_url,
    });
  }

  return out;
}

/** "Hercules Plc (HERC)" -> "Hercules Plc". Mirrors cleanCompanyName in
 *  src/lib/company.ts; duplicated rather than imported because that module is
 *  TypeScript inside the Vite graph and this file is read by Pages Functions
 *  too. Keep the two in step. */
export function cleanName(name) {
  let s = String(name ?? "").trim();
  let prev = null;

  while (s !== prev) {
    prev = s;
    s = s
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
      .trim();
  }

  return s;
}

/** The standing note. On the page, not under it. */
export const FILING_NOTICE =
  "Returns are measured from the closing price on the day the filing was published, the first price a reader could have paid, and marked to the latest cached close rather than live. Past performance is not a reliable indicator of future results, and nothing here is advice.";
