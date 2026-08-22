// The US half of the per-filing page family.
//
// shared/filings.js ends its `sharePrice` note with an instruction:
//
//   "The US pipeline does not reach here. It has its own row type (`UsDealing`,
//    with `value` and `currency: "USD"`) and no per-row detail route, and this
//    family is UK-only for exactly that reason. If a US filing page ever lands,
//    it needs its own formatter rather than a branch inside this one."
//
// This is that file. The US filing page landed on 2026-08-22 (the reply-radar
// work needed a per-trade link to send people to, and /us/t/{id} was a bare
// redirect to the App Store).
//
// SEPARATE FILE, NOT A BRANCH, and the reason is the bug the UK note records:
// a `currency`-sensitive formatter shared by both markets is exactly what
// printed "$46.88" for a 4687.76p share price, because on a UK row `currency`
// describes the DISCLOSURE while the numbers beside it are FX-converted GBP.
// Two markets whose money fields mean different things do not want one function
// with an `if` in it; they want two functions and a caller that picks.
//
// So this file is deliberately parallel rather than clever. Everything here has
// a UK counterpart of the same name in shared/filings.js, and the market-blind
// helpers (money, shares, disclosureLagDays, signedPct, outcomeSentence,
// awaitingOutcome, clusterSentence, styleSentence, analysisShape,
// evidenceHeadlines, cleanName, filingMeetsBar) are imported from there rather
// than copied — those read `analysis`, `cluster`, `buy_style` and
// `live_performance`, which are the SAME wire shapes on both markets by
// design (see the note on `UsDealing.analysis` in ddbx-data worker/db/types.ts).
//
// What the page publishes and withholds is decided in shared/filings.js and is
// identical here. Read that header before adding anything from `analysis`.

import { cleanName, disclosureLagDays, money, shares } from "./filings.js";

/* ─── URLs ───────────────────────────────────────────────────────────────── */

/** US filing ids are the per-leg Form 4 key, `f4-{accession}-{table}-{row}`.
 *  Longer and dot-free but otherwise the same contract as the UK id: opaque,
 *  stable, and the whole path. */
export const usFilingPath = (id) => `/us/dealings/${id}`;

/** "/us/dealings/f4-0001-26-1-0" -> the id, or null. Same validate-don't-trust
 *  posture as filingIdFromPath: a junk path becomes a clean not-found rather
 *  than a wasted API call. The charset is wider than the UK one because the
 *  accession number carries dashes and the id carries table/row suffixes. */
export function usFilingIdFromPath(path) {
  const m = String(path ?? "").match(/^\/us\/(?:dealings|t)\/([A-Za-z0-9_-]{4,96})$/);

  return m ? m[1] : null;
}

/* ─── Formatting ─────────────────────────────────────────────────────────── */

/** Money on a US row. `value` is USD majors already — no FX step, no
 *  pence/pounds split — so this is `money` with the currency pinned rather than
 *  inferred. Pinned, not read from `d.currency`, for the same reason the UK
 *  side pins GBP: the field is about the filing, not about the number. */
export const usMoney = (value) => money(value, "USD");

/** Share price, in dollars.
 *
 *  Two decimals and a leading symbol, which is how a Form 4 states it. Not
 *  `money()`: that abbreviates to "k"/"m" for the consideration, and a share
 *  price of "$20" instead of "$20.46" loses the digits that make the number
 *  worth printing at all.
 *
 *  `price` is nullable on a US row in a way `price_pence` is not — the filing
 *  can footnote the price instead of stating it (distributions, complex
 *  transactions) — so this returns null rather than "$0.00", and every caller
 *  has to decide what to show instead. A fabricated zero is worse than a gap. */
export function usSharePrice(d) {
  const p = Number(d?.price);

  if (!Number.isFinite(p) || p <= 0) return null;

  return `$${p.toFixed(2)}`;
}

/** Who filed, and what they are.
 *
 *  Form 4 gives the relationship as checkboxes plus a free-text officer title,
 *  where the UK gives one `director.role` string. An officer's title is the
 *  most informative thing available, so it wins; otherwise the checkboxes are
 *  turned into a phrase. A reporter can be several of these at once (a
 *  director who is also a 10% owner), and the title alone would not say so.
 *
 *  Returning null for the role rather than "Insider" is deliberate: the callers
 *  all render the role as an appositive, and ", Insider," is noise where an
 *  omitted clause is clean. */
export function usInsider(d) {
  const r = d?.reporter;
  const roles = Array.isArray(r?.roles) ? r.roles : [];

  if (r?.officer_title) return { name: r.name, role: r.officer_title };

  const label = [
    roles.includes("director") && "Director",
    roles.includes("officer") && "Officer",
    roles.includes("ten_percent_owner") && "10% owner",
  ].filter(Boolean);

  return { name: r?.name ?? "An insider", role: label.join(" and ") || null };
}

/** What kind of transaction this was, in words.
 *
 *  The single most important quality flag in US insider data is `aff_10b5_one`:
 *  a purchase made under a pre-arranged Rule 10b5-1 plan carries approximately
 *  no current-view signal, because the decision to buy was taken months before
 *  the fill. The UK has no equivalent, which is why this label has no UK
 *  counterpart — and why it says so on the page rather than leaving a reader to
 *  infer it from a "P" they have never seen before.
 *
 *  `is_open_market_buy === false` is the classifier's verdict that the fill is
 *  not replicable (penny stock, non-exchange issuer, placement-priced). It is
 *  stated, not hidden: a link to a filing must render the filing. */
export function usTransactionLabel(d) {
  if (d?.transaction_code !== "P") {
    return d?.acquired_disposed === "D" ? "Disposal" : "Acquisition";
  }
  if (d?.aff_10b5_one) return "Purchase under a 10b5-1 plan";
  if (d?.is_open_market_buy === false) return "Purchase (not open-market)";

  return "Open-market purchase";
}

/* ─── The sentences ──────────────────────────────────────────────────────── */

/** The page's opening sentence, and its meta description. Deterministic and
 *  ours, for the reasons filingLeadSentence records on the UK side — the
 *  generated summaries refer to an assessment this page does not publish.
 *
 *  Says "on the open market" only where that is what happened, and names the
 *  10b5-1 plan where there was one. Both are the difference between a sentence
 *  a reader can act on and one that flatters the filing. */
export function usFilingLeadSentence(d) {
  const { name, role } = usInsider(d);
  const roleBit = role ? `, ${role},` : "";
  const company = cleanName(d?.company) || d?.ticker || "the company";
  const verb = d?.acquired_disposed === "D" ? "sold" : "bought";
  const lag = disclosureLagDays(d);
  const lagBit =
    lag == null
      ? ""
      : lag === 0
        ? ` on ${d.trade_date}, disclosed the same day`
        : ` on ${d.trade_date}, disclosed ${lag} ${lag === 1 ? "day" : "days"} later`;
  const planBit = d?.aff_10b5_one ? " under a pre-arranged 10b5-1 plan" : "";
  const valueBit = d?.value == null ? "" : ` for ${usMoney(d.value)}`;

  return `${name}${roleBit} ${verb} ${shares(d?.shares)} shares in ${company}${valueBit}${planBit}${lagBit}.`;
}

/** The context a check's `passLine` interpolates, pre-formatted. Mirrors
 *  checkContext; shared/methodology.js owns the copy and does no formatting, so
 *  the dollars get made into strings here. */
export function usCheckContext(d) {
  const { name, role } = usInsider(d);

  return {
    name: name || "The insider",
    role: role || undefined,
    company: cleanName(d?.company) || d?.ticker || "the company",
    price: usSharePrice(d),
    value: d?.value == null ? null : usMoney(d.value),
  };
}
