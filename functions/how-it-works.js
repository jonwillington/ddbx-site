// Crawler pre-render for the methodology page: ddbx.uk/how-it-works,
// ddbx.us/how-it-works.
//
// Almost all of this page is editorial — six checks, six pipeline stages, four
// ratings — and all of that is static text the SPA holds in
// src/lib/methodology.ts. So the pre-render's job is mostly to make sure a
// crawler that doesn't run JS finds the argument rather than an empty
// <div id="root">, which is what it found for the whole time this content lived
// inside a modal.
//
// The one fetch is /api/coverage, which is what the page's volume section
// renders. It is here rather than hard-coded for the same reason the React side
// fetches it: a number typed into a file is wrong within a week. The endpoint is
// edge-cached for six hours and `fetchJson` returns null on any failure, so the
// worst case is a crawler seeing the page without its numbers rather than a
// crawler seeing numbers the database stopped agreeing with. The parity rule
// applies as everywhere else in this directory: what the crawler is told here is
// visible text on the hydrated page.
//
// The duplication with methodology.ts is the same deliberate trade the rest of
// this directory makes: Pages Functions are bundled separately from the Vite app
// and can resolve neither the "@/" alias nor .tsx, so a Function that wants the
// checks either restates them or the module moves to shared/ as plain JS. It
// isn't in shared/ because the TypeScript side is where it earns its keep — the
// `keyof RatingChecklist` constraint on the keys is what keeps the six honest
// against ddbx-data, and that constraint doesn't survive the trip to .js.
//
// The mitigation is that this file carries the SHORT form of each check and the
// page carries the long form, so the two can't silently disagree about wording
// they don't share. If a check is added, removed or renamed, both change — the
// header of methodology.ts says so.
//
// This route is on the middleware's skip list, so this Function owns the entire
// <head>: title, description, canonical, the preview-host noindex. Nothing else
// sets them.

import {
  apexHost,
  esc,
  fetchJson,
  noindex,
  page,
  renderInto,
} from "../shared/prerender.js";
import { brandTitle, isProductionHost, marketIdForPath } from "../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";

/** Feed display names AND their caveats. Mirrors FEEDS in src/lib/coverage.ts —
 *  the same duplication trade the rest of this file makes, and for the same
 *  reason.
 *
 *  The notes are not optional here. An earlier version of this Function carried
 *  the numbers and left the caveats to hydration, which meant the crawled page
 *  said "Netherlands. 11,908 records" with nothing to say that those reach back
 *  to 2006 because of a one-off bulk load. That is the single biggest figure in
 *  the list and this is the surface most likely to be quoted verbatim by a
 *  search snippet, so dropping the caveat broke the parity rule in precisely
 *  the direction that flatters us. */
const FEEDS = {
  UK: { name: "United Kingdom" },
  US: { name: "United States" },
  SE: { name: "Sweden" },
  NL: {
    name: "Netherlands",
    note: "Seeded with the register’s own back history, so these records reach far further back than the live watch does.",
  },
  USG: {
    name: "US Congress",
    note: "Amount bands rather than exact values, and sorted by fixed rules rather than by a model.",
  },
};
const FEED_ORDER = ["UK", "US", "SE", "NL", "USG"];

const num = (n) => Number(n ?? 0).toLocaleString("en-GB");

/** Per-market vocabulary. Mirrors MARKET_COPY in src/lib/markets/market-copy.ts
 *  for the two hosts that publish this page. */
const COPY = {
  uk: {
    insiderTerm: "director",
    insiderTermPlural: "directors",
    possessive: "a director’s",
    source: "London Stock Exchange RNS filings",
    exchange: "the London Stock Exchange",
    titleRest: "How we rate UK director share purchases — our method",
    description:
      "How an RNS disclosure becomes a rating: the six checks every UK director share purchase is scored against, what each rating means, where the filings come from, and where the method stops.",
  },
  us: {
    insiderTerm: "insider",
    insiderTermPlural: "insiders",
    possessive: "an insider’s",
    source: "SEC EDGAR Form 4 filings",
    exchange: "NYSE & Nasdaq",
    titleRest: "How we rate US insider stock purchases — our method",
    description:
      "How a Form 4 becomes a rating: the six checks every US insider purchase is scored against, what each rating means, where the filings come from, and where the method stops.",
  },
};

/** The six checks, short form. Order mirrors CHECKLIST_KEYS in
 *  ddbx-data/worker/pipeline/analyze.ts and CHECKS in src/lib/methodology.ts. */
const CHECKS = [
  [
    "Was it an open-market buy?",
    "They paid for the shares themselves on the open market. Not an option grant, a vesting, or an internal transfer.",
  ],
  [
    "Was it a senior insider?",
    "The buyer is a CEO, CFO, or a board member close to the business, not a junior name on the register.",
  ],
  [
    "Did they show real conviction?",
    "The amount is large relative to what they earn, so it reads as a real commitment rather than a token.",
  ],
  [
    "Was the timing their own call?",
    "Nothing mechanical explains the timing: no dividend reinvestment, no pre-arranged trading plan, no contractual or tax deadline.",
  ],
  [
    "Does the context hold up?",
    "Either there is news that makes the timing make sense, or nothing public argues against it. A buy in a quiet period can be the strongest kind.",
  ],
  [
    "Is the picture otherwise clean?",
    "Nothing serious points the other way: no other insiders selling at the same time, no open investigation, no sign the business is still getting worse.",
  ],
];

/** The pipeline, short form. Mirrors PIPELINE in src/lib/methodology.ts. */
const STAGES = [
  [
    "Watch",
    "We read the regulator’s own feed, never a third-party summary of it. The pipeline runs every fifteen minutes through the trading day.",
  ],
  [
    "Classify",
    "Awards, vestings, option exercises, placings and disposals are pulled out. Only open-market purchases go further.",
  ],
  [
    "Triage",
    "A fast first pass weighs each surviving buy against its context. Most filings stop here.",
  ],
  [
    "Analyse",
    "What is left gets the long read, with the case against alongside the case for. Every piece of evidence must carry a working source link.",
  ],
  [
    "Rate",
    "The six checks are applied and the result is a rating from significant down to routine, published with its reasoning.",
  ],
  [
    "Track",
    "Every rated buy is followed from its disclosure-day close and scored against the index.",
  ],
];

const RATINGS = [
  ["Significant", "All six checks clear. Deliberately hard to reach."],
  ["Noteworthy", "Most of the picture holds up, but something is missing or ambiguous."],
  ["Minor", "A real decision, but small, or by someone far enough from the business that it says little."],
  ["Routine", "Disclosed, but not informative — the housekeeping that makes up most of what gets filed."],
];

const list = (items, render) =>
  `<ol style="font-size:14px;line-height:1.7;padding-left:18px">${items
    .map(render)
    .join("")}</ol>`;

/** The volume section, or nothing.
 *
 *  Omitted entirely when the fetch failed. A crawler served "0 disclosure
 *  records" would be told something false about the corpus, and false is
 *  strictly worse than absent. */
function coverageSection(coverage) {
  if (!coverage?.totals) return "";

  const feeds = FEED_ORDER.map((id) =>
    (coverage.markets ?? []).find((m) => m.market === id),
  ).filter(Boolean);

  return `<h2 style="font-size:17px;margin:32px 0 10px">What we’ve read so far</h2>
  <p style="font-size:14px;line-height:1.7;max-width:62ch">Five disclosure feeds, each read in its own format: ${num(
    coverage.totals.disclosures,
  )} disclosure records, ${num(
    coverage.totals.triage_decisions,
  )} first-pass sorting decisions (${num(
    coverage.totals.triage_llm,
  )} of them made by a model, the rest by fixed rules) and ${num(
    coverage.totals.analyses,
  )} full written analyses. The price history behind every return on the site runs to ${num(
    coverage.prices?.observations,
  )} daily closes across ${num(
    coverage.prices?.tickers,
  )} tickers. A disclosure record is one row as its regulator filed it, not one trade: the feeds are not like-for-like and the total is not a count of purchases.</p>
  <ul style="font-size:14px;line-height:1.7;padding-left:18px">${feeds
    .map((f) => {
      const feed = FEEDS[f.market] ?? { name: f.market };

      return `<li><strong>${esc(feed.name)}.</strong> ${num(
        f.disclosures,
      )} records, ${num(f.insiders)} filers, ${num(f.issuers)} issuers.${
        feed.note ? ` ${esc(feed.note)}` : ""
      }</li>`;
    })
    .join("")}</ul>`;
}

/** How much of the corpus has a measured outcome, and at which horizons.
 *
 *  The least flattering paragraph on the page, which is why it is pre-rendered
 *  rather than left to hydration: the visible claim and the crawled claim have
 *  to be the same claim, and this is the one a reader is most entitled to. */
function measuredSection(coverage) {
  const horizons = (coverage?.outcomes?.horizons ?? []).filter(
    (h) => h.events > 0,
  );

  if (!horizons.length) return "";

  const split = horizons
    .map((h) => `${num(h.events)} at ${h.horizon_days} days`)
    .join(", ");

  return `<h2 style="font-size:17px;margin:32px 0 10px">What we can measure, and how much of it there is</h2>
  <p style="font-size:14px;line-height:1.7;max-width:62ch">Rated buys are followed from their disclosure-day close and scored against the index, both legs taken from the same price series and stored beside a benchmark over the identical window. It runs on the two rated markets, the United Kingdom and the United States, and has measured ${num(
    coverage.outcomes.events,
  )} buys between them. The count thins out fast as the horizon lengthens: ${esc(
    split,
  )}. The thirty-day evidence is real; the one-year evidence barely exists yet, which is why performance figures elsewhere on the site are described as a small sample rather than as a track record.</p>`;
}

function prerender(copy, coverage) {
  return page(
    `<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 16px">How we rate ${esc(copy.possessive)} share purchase</h1>
  <p style="font-size:16px;line-height:1.6;color:#4a4034;max-width:62ch">Several hundred ${esc(copy.insiderTermPlural)} disclose share dealings every month, and almost none of them mean anything. This is what we do with them — how a filing becomes a rating, what the six checks behind that rating actually test, how much we have put through it, and where the method stops.</p>

  ${coverageSection(coverage)}

  <h2 style="font-size:17px;margin:32px 0 10px">What happens to a disclosure</h2>
  ${list(
    STAGES,
    ([label, body]) =>
      `<li style="margin-bottom:10px"><strong>${esc(label)}.</strong> ${esc(body)}</li>`,
  )}

  <h2 style="font-size:17px;margin:32px 0 10px">The six checks</h2>
  ${list(
    CHECKS,
    ([question, body]) =>
      `<li style="margin-bottom:10px"><strong>${esc(question)}</strong><br>${esc(body)}</li>`,
  )}

  <h2 style="font-size:17px;margin:32px 0 10px">The four ratings</h2>
  <dl style="font-size:14px;line-height:1.7">${RATINGS.map(
    ([rating, meaning]) =>
      `<dt style="font-weight:600;margin-top:10px">${esc(rating)}</dt><dd style="margin:0;color:#4a4034">${esc(meaning)}</dd>`,
  ).join("")}</dl>

  <h2 style="font-size:17px;margin:32px 0 10px">Where the filings come from</h2>
  <p style="font-size:14px;line-height:1.7;max-width:62ch">We read ${esc(copy.source)}, covering companies listed on ${esc(copy.exchange)}, filed by the people local rules call ${esc(copy.insiderTermPlural)} — in their own format, never a third party’s summary of them, checked every fifteen minutes through the trading day.</p>

  ${measuredSection(coverage)}

  <h2 style="font-size:17px;margin:32px 0 10px">Where the method stops</h2>
  <p style="font-size:14px;line-height:1.7;max-width:62ch">A rating describes how a purchase reads against six specific tests. It is not advice, not a price target, and carries no view on whether the shares are worth buying today. The checks are judgements and can be marked wrongly in either direction; the pipeline only sees what gets disclosed; and the checklist itself is adjusted as the record builds, so a filing’s rating can change after publication.</p>

  <p style="margin-top:32px;font-size:13px;color:#6b6154;max-width:62ch">Information only, not investment advice.</p>`,
  );
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);

  const shell = await context.next();

  // On the middleware's skip list, so the preview-host noindex lands here.
  if (!isProductionHost(url.hostname)) return noindex(shell);

  const id = marketIdForPath("/how-it-works", host);
  const copy = COPY[id];

  // ddbx.eu is 301'd upstream by the middleware, so this is unreachable in
  // production — but a host that resolves to a market with no analysis layer
  // must not be served a description of one, whatever routes it by.
  if (!copy) return noindex(shell);

  const canonical = `https://${host}/how-it-works`;

  // Six hours, matching the endpoint's own max-age. Null on any failure, which
  // drops the two counted sections rather than failing the pre-render.
  const coverage = await fetchJson(`${API_BASE}/coverage`, 21600);

  return renderInto(shell, {
    title: brandTitle(copy.titleRest),
    description: copy.description,
    canonical,
    breadcrumbs: [{ name: "How it works", item: canonical }],
    body: prerender(copy, coverage),
  });
}
