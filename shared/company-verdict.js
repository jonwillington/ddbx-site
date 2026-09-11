// How a company's disclosed buying has done, said once.
//
// Plain ESM at the root, imported by src/pages/company.tsx and
// functions/company/[key].js, for the reason shared/company-context.js is: a
// crawler reading a different verdict from the visitor is a page arguing with
// itself.
//
// ---------------------------------------------------------------------------
// Why the company page needs this
// ---------------------------------------------------------------------------
//
// A reader who searches a company name arrives with one question, whether the
// insiders' buying worked, and until 2026-09-11 the page never answered it. It
// counted: "1 director has bought £32k across 2 disclosed dealings". The
// boards had moved on to leading with the finding, and every row the company
// page lists already carries the server's `live_performance` mark, the same
// figure /biggest-buys prints, so the answer cost nothing but saying it.
//
// The bar is the site's: state nothing we cannot compute (static-page rule 2).
// A purchase with no mark is left out of the figures and the sentence says how
// many are in, never assumes the rest were flat.

import { buyAlpha, buyReturn, buyValue } from "./leaderboard.js";

/** The index each market's alpha is measured against. Mirrors `BENCHMARK` in
 *  src/components/boards/board-prices.ts, which carries the price tickers. */
export const INDEX_LABEL = { UK: "the FTSE All-Share", US: "the S&P 500" };

/** Below this an alpha is level, not ahead or behind. Matches the boards'
 *  `direction()`, so a row's badge and this sentence cannot disagree. */
const FLAT = 0.0005;

/** The figures, over the purchases that carry a mark. */
export function buysOutcome(deals) {
  const rows = (deals ?? []).map((d) => ({
    value: buyValue(d),
    ret: buyReturn(d),
    alpha: buyAlpha(d),
  }));
  const marked = rows.filter((r) => r.ret != null && r.value > 0);

  if (marked.length === 0) return null;

  const paid = marked.reduce((s, r) => s + r.value, 0);
  const worth = marked.reduce((s, r) => s + r.value * (1 + r.ret), 0);
  const alphas = marked.filter((r) => r.alpha != null);

  return {
    count: rows.length,
    measured: marked.length,
    paid,
    worth,
    /** Purchases with an alpha, the denominator for `ahead`. */
    compared: alphas.length,
    ahead: alphas.filter((r) => r.alpha > FLAT).length,
    /** The one alpha, when there is exactly one to state. */
    alpha: alphas.length === 1 ? alphas[0].alpha : null,
  };
}

/** "£26k", "$1.2m", "£640". The page's own short form, repeated here because
 *  shared modules cannot reach src/lib. Unlike sectors.js' formatMoney it does
 *  not print a £300 purchase as "£0k". */
export function shortMoney(value, symbol) {
  const n = Math.abs(Number(value));

  if (!isFinite(n)) return "";
  if (n >= 999_500_000) return `${symbol}${(n / 1_000_000_000).toFixed(1)}bn`;
  if (n >= 999_500) {
    const m = n / 1_000_000;

    return `${symbol}${m >= 9.95 ? Math.round(m) : m.toFixed(1)}m`;
  }
  if (n >= 1_000) return `${symbol}${Math.round(n / 1_000)}k`;

  return `${symbol}${Math.round(n)}`;
}

function aheadClause(o, index) {
  const { ahead, compared } = o;

  if (compared === 0) return null;
  if (compared === 1) {
    const pp = Math.abs(o.alpha * 100).toFixed(1);

    if (Math.abs(o.alpha) < FLAT) {
      return `That is level with ${index} since the purchase was disclosed.`;
    }

    return `That is ${pp} percentage points ${o.alpha > 0 ? "ahead of" : "behind"} ${index} since the purchase was disclosed.`;
  }
  if (compared === 2) {
    if (ahead === 2) {
      return `Both purchases are ahead of ${index} since they were disclosed.`;
    }
    if (ahead === 0) {
      return `Neither purchase is ahead of ${index} since it was disclosed.`;
    }

    return `One of the two is ahead of ${index} since it was disclosed.`;
  }
  if (ahead === compared) {
    return `All ${compared} are ahead of ${index} since they were disclosed.`;
  }
  if (ahead === 0) {
    return `None of the ${compared} is ahead of ${index} since it was disclosed.`;
  }

  return `${ahead} of the ${compared} ${ahead === 1 ? "is" : "are"} ahead of ${index} since ${ahead === 1 ? "it was" : "they were"} disclosed.`;
}

/** Two plain sentences: what the money is worth now, and how that compares
 *  with the market. Null when no purchase has a mark, and the renderer says
 *  nothing rather than something empty. */
export function outcomeSentence(outcome, market, symbol) {
  if (!outcome) return null;
  const index = INDEX_LABEL[market] ?? INDEX_LABEL.UK;
  const paid = shortMoney(outcome.paid, symbol);
  const worth = shortMoney(outcome.worth, symbol);
  const subject =
    outcome.measured === outcome.count
      ? outcome.count === 1
        ? `the ${paid} stake`
        : `the ${paid} paid`
      : `the ${paid} paid for the ${outcome.measured} ${outcome.measured === 1 ? "purchase" : "purchases"} with a price since`;
  const first = `At the latest close ${subject} is worth ${worth}, if still held.`;
  const second = aheadClause(outcome, index);

  return second ? `${first} ${second}` : first;
}
