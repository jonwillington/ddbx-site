// Which set of per-filing formatters a market uses.
//
// shared/filings.js (UK) and shared/filings-us.js (US) are deliberately two
// parallel families rather than one family with market branches inside it —
// see the header of filings-us.js for the bug that reasoning came out of. That
// leaves one job: picking. This file is that pick, in one place, so the React
// page (src/pages/filing.tsx) and the crawler pre-renders
// (functions/t/[id].js, functions/us/t/[id].js) cannot drift apart on it.
//
// The interface below is the ONLY surface the filing page is allowed to use for
// anything market-dependent. If a component needs a new market-dependent fact,
// it gets added here with both implementations at once — which is the property
// that stops a US page quietly rendering a UK sentence.
//
// Everything NOT in this interface is market-blind on purpose: `analysis`,
// `cluster`, `buy_style` and `live_performance` are the same wire shapes on
// both markets (ddbx-data worker/db/types.ts states this explicitly for
// `UsDealing.analysis`), so `analysisShape`, `evidenceHeadlines`,
// `clusterSentence`, `styleSentence`, `outcomeSentence`, `awaitingOutcome`,
// `disclosureLagDays`, `filingMeetsBar` and `cleanName` are imported straight
// from shared/filings.js by both callers and are not repeated here.

import {
  checkContext,
  filingIdFromPath,
  filingLeadSentence,
  filingPath,
  money,
  sharePrice,
} from "./filings.js";
import {
  usCheckContext,
  usFilingIdFromPath,
  usFilingLeadSentence,
  usFilingPath,
  usInsider,
  usMoney,
  usSharePrice,
  usTransactionLabel,
} from "./filings-us.js";

/** The UK has no 10b5-1 equivalent and no non-open-market classifier verdict
 *  worth a distinct phrase, so its transaction label is the three-way it always
 *  was, lifted out of filing.tsx so both markets state this in one place. */
function ukTransactionLabel(d) {
  if (d?.is_open_market_buy) return "Open-market purchase";

  return d?.tx_type === "buy" ? "Purchase" : "Disposal";
}

/** `director` on a UK row, `reporter` on a US one. Same two fields out. */
function ukInsider(d) {
  return { name: d?.director?.name ?? "An insider", role: d?.director?.role || null };
}

const UK = {
  marketId: "uk",
  /** Which host this market's pages live on, for canonical + share URLs. */
  host: "ddbx.uk",
  currency: "GBP",
  path: filingPath,
  idFromPath: filingIdFromPath,
  /** The consideration, in the market's canonical field. UK rows carry the
   *  FX-converted `value_gbp`; `currency` on a UK row describes the RNS, not
   *  this number. */
  value: (d) => d?.value_gbp ?? null,
  money,
  sharePrice,
  insider: ukInsider,
  leadSentence: filingLeadSentence,
  checkContext,
  transactionLabel: ukTransactionLabel,
  /** Where the OG card for one filing is rendered. */
  ogImage: (id) =>
    `https://api.ddbx.uk/api/dealings/${encodeURIComponent(id)}/og.png`,
};

const US = {
  marketId: "us",
  host: "ddbx.us",
  currency: "USD",
  path: usFilingPath,
  idFromPath: usFilingIdFromPath,
  value: (d) => d?.value ?? null,
  money: usMoney,
  sharePrice: usSharePrice,
  insider: usInsider,
  leadSentence: usFilingLeadSentence,
  checkContext: usCheckContext,
  transactionLabel: usTransactionLabel,
  ogImage: (id) =>
    `https://api.ddbx.uk/api/us-dealings/${encodeURIComponent(id)}/og.png`,
};

/** Pick a family. Anything that is not explicitly US gets UK, so a missing or
 *  malformed market renders the market this site started as rather than
 *  throwing on a page a stranger arrived at from a link. */
export function filingFamily(market) {
  return String(market ?? "").toUpperCase() === "US" ? US : UK;
}
