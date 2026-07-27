// Crawler pre-render for the report archive: /reports.
//
// The archive had no Function of its own, which cost two different things.
//
// The first is a real indexing defect rather than a missed opportunity:
// ddbx.us has no monthly reports, so on that host /reports is an indexable URL
// whose entire body is "No reports published for this market yet." A thin page
// submitted in the sitemap and left indexable is exactly the sort of URL that
// drags a small site's crawl budget and quality signals. The month pages get a
// noindex when there's nothing behind them (see [month].js); the index they
// hang off did not.
//
// The second is that the hub of a hub-and-spoke should carry the spokes. A
// crawler without JS saw an empty shell where the month links are.
//
// /reports is on the middleware's skip list (two head passes would emit two
// rel=canonical tags), so this Function owns the entire <head> — title,
// description, canonical, and the preview-host noindex.

import {
  esc,
  fetchJson,
  noindex,
  page,
  renderInto,
} from "../../shared/prerender.js";
import { monthLabel, reportPath } from "../../shared/months.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";

const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };
const BUYER_NOUN = { UK: "director", US: "insider" };

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

// £ only, matching [month].js and the SPA's formatGbp. Wrong for a US report
// the day one exists; the currency is a wire-format change, not a local one.
const money = (v) => {
  const n = Number(v);

  if (!isFinite(n) || n === 0) return "—";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;

    return `£${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}m`;
  }

  return `£${Math.round(n / 1000)}k`;
};

/** "2026-07-01T…" → "1 Jul 2026". Empty when unparseable. Mirrors the
 *  right-set publication date on each archive row in src/pages/reports.tsx. */
const published = (iso) => {
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

/** The "What's in every report" explainer. Kept verbatim in step with
 *  `CONTENTS` in src/pages/reports.tsx — the pre-render and the page have to
 *  say the same thing, and this block is most of the page's crawlable prose. */
const CONTENTS = [
  [
    "The month in numbers",
    "How many purchases were disclosed, what they were worth, and how many companies and individual insiders they covered.",
  ],
  [
    "A report card on the last one",
    "Every buy we featured the previous month, re-marked against the latest close — the ones that went wrong published beside the ones that didn’t.",
  ],
  [
    "The standout buys, written up",
    "A handful of purchases in full: what happened, whether the value has already gone, and whether there is still a case.",
  ],
  [
    "Where the money went",
    "The month split by sector and by buy style, with the median return and the median alpha against the benchmark for each slice.",
  ],
  [
    "Clusters",
    "The companies where two or more insiders bought in the same month — the pattern that reads least like a one-off.",
  ],
];

function prerender(market, summaries, latest) {
  const noun = BUYER_NOUN[market];
  const lead = summaries[0];
  const m = latest?.metrics;

  const heroFacts = m
    ? `<p style="font-size:14px;color:#6b6154">${esc(m.total_buys)} buys · ${esc(money(m.total_value_gbp))} · ${esc(m.distinct_companies)} companies · ${esc(m.distinct_directors)} insiders</p>`
    : "";

  const rows = summaries
    .map(
      (s) =>
        `<li style="margin-bottom:10px"><a href="${esc(reportPath(s.month))}">${esc(monthLabel(s.month))}</a>${
          s.created_at
            ? ` <span style="color:#6b6154">· published ${esc(published(s.created_at))}</span>`
            : ""
        }<br>${esc(s.headline)}</li>`,
    )
    .join("");

  const contents = CONTENTS.map(
    ([label, description]) =>
      `<li style="margin-bottom:8px"><strong>${esc(label)}</strong> — ${esc(description)}</li>`,
  ).join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(market)} ${esc(noun)} buying reports</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">A report every month: what insiders bought, what it was worth, which sectors they concentrated in, and how the previous month’s featured buys have actually performed since — including the ones that didn’t work.</p>
  <p style="font-size:13px;color:#6b6154">ddbx started recording disclosures in March 2026, so periods described as a full year cover only the filings since then.</p>
  ${
    lead
      ? `<h2 style="font-size:15px;margin:32px 0 10px">Latest report — ${esc(monthLabel(lead.month))}</h2>
  <p style="font-size:19px;font-weight:600;line-height:1.3;margin:0 0 8px">${esc(lead.headline)}</p>
  ${heroFacts}
  <p style="font-size:14px"><a href="${esc(reportPath(lead.month))}">Read the ${esc(monthLabel(lead.month))} report</a></p>`
      : ""
  }
  <h2 style="font-size:15px;margin:32px 0 10px">What’s in every report</h2>
  <ul style="font-size:14px;line-height:1.7;max-width:62ch">${contents}</ul>
  <h2 style="font-size:15px;margin:32px 0 10px">Every report</h2>
  <ul style="font-size:14px;line-height:1.7">${rows}</ul>
  <p style="margin-top:24px;font-size:13px;color:#6b6154">Reports are generated from disclosed filings and marked against subsequent closing prices. Past performance is not a reliable indicator of future results.</p>`);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);

  const market = MARKET_BY_HOST[host];

  if (!market) return noindex(shell);

  const marketParam = market === "US" ? "?market=US" : "";
  const data = await fetchJson(`${API_BASE}/monthly-summaries${marketParam}`);
  const summaries = (data?.summaries ?? [])
    .slice()
    .sort((a, b) => String(b.month).localeCompare(String(a.month)));

  // An archive with nothing in it is not a page. ddbx.us is here today: the
  // route resolves, the SPA renders its empty state, and neither is worth an
  // index entry.
  if (summaries.length === 0) return noindex(shell);

  // Figures for the promoted month only — the same one extra request the page
  // makes, so the pre-render and the rendered lead state the same numbers.
  const latestData = await fetchJson(
    `${API_BASE}/monthly-summary?month=${encodeURIComponent(summaries[0].month)}${market === "US" ? "&market=US" : ""}`,
  );
  const latest = latestData?.summary ?? null;

  const canonical = `https://${host}/reports`;
  const title = brandTitle(
    `${market} ${BUYER_NOUN[market]} buying reports — every month since ${monthLabel(summaries.at(-1).month)}`,
  );
  const description = `Monthly ${market} ${BUYER_NOUN[market]} buying reports: what was bought, what it was worth, where it concentrated, and how the previous month’s featured buys have performed since. ${summaries.length} ${summaries.length === 1 ? "month" : "months"} archived, newest ${monthLabel(summaries[0].month)}.`;

  return renderInto(shell, {
    title,
    description,
    canonical,
    breadcrumbs: [{ name: "Reports", item: canonical }],
    body: prerender(market, summaries, latest),
  });
}
