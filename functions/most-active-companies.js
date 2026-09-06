// Crawler pre-render for the most-active-companies board.
//
// Ranks companies, not people — see the header on src/pages/most-active-
// companies.tsx for why that distinction is what lets the page exist. The
// ranking and the methodology come from shared/boards.js, the same module the
// React page uses.

import { fetchDealingsWindow } from "../shared/dealings-feed.js";
import {
  rankCompanies,
  ACTIVITY_METHODOLOGY,
  MIN_COMPANY_FILINGS,
  TOP_N,
} from "../shared/boards.js";
import { esc, noindex, page, renderInto } from "../shared/prerender.js";
import { windowStart } from "../shared/sectors.js";
import { brandTitle, isProductionHost } from "../shared/seo.js";
import { trackingNotice } from "../shared/tracking.js";

const API_BASE = "https://api.ddbx.uk/api";
const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };
const SYMBOL = { UK: "£", US: "$" };

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

function money(v, symbol) {
  const n = Number(v);

  if (!isFinite(n) || n === 0) return "—";
  if (n >= 1_000_000_000) return `${symbol}${(n / 1_000_000_000).toFixed(1)}bn`;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;

    return `${symbol}${m >= 10 ? Math.round(m) : m.toFixed(1)}m`;
  }

  return `${symbol}${Math.round(n / 1000)}k`;
}

const signedPp = (r) =>
  r == null ? "n/a" : `${r > 0 ? "+" : ""}${(r * 100).toFixed(1)}pp`;

const displayTicker = (t) => String(t ?? "").replace(/\.L$/i, "");

const cleanCompany = (c) => {
  let out = String(c ?? "").trim();

  for (;;) {
    const next = out
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
      .trim();

    if (next === out || next === "") return out;
    out = next;
  }
};

/** The same sentence the hydrated row prints. One insider filing repeatedly is
 *  a different story from a board acting together, and a filing count alone
 *  cannot tell them apart. */
const breadthLabel = (insiders) =>
  insiders === 1 ? "all by one insider" : `${insiders} different insiders`;

function leadSentence(rows, market) {
  const noun = market === "US" ? "insiders" : "directors";
  const top = rows[0];

  if (!top)
    return `The ${market} companies whose own ${noun} bought most often over the last twelve months.`;

  return `The ${market} companies whose own ${noun} bought most often over the last twelve months, led by ${cleanCompany(top.company) || displayTicker(top.ticker)} with ${top.filings} purchases from ${top.insiders} ${top.insiders === 1 ? "insider" : "insiders"}.`;
}

function prerender(rows, qualifying, market, host, complete) {
  const symbol = SYMBOL[market];

  const cell = "padding:8px 12px;border-bottom:1px solid #ece1cf";

  const body = rows
    .map(
      (r, i) => `<tr>
      <td style="${cell}">${i + 1}</td>
      <td style="${cell}"><a href="https://${esc(host)}/company/${esc(displayTicker(r.ticker).toLowerCase())}">${esc(cleanCompany(r.company) || displayTicker(r.ticker))}</a></td>
      <td style="${cell}">${esc(r.filings)}</td>
      <td style="${cell}">${esc(breadthLabel(r.insiders))}</td>
      <td style="${cell}">${esc(money(r.value, symbol))}</td>
      <td style="${cell}">${esc(r.alphaCount > 0 ? signedPp(r.medianAlpha) : "n/a")}</td>
    </tr>`,
    )
    .join("");

  const method = ACTIVITY_METHODOLOGY.map(
    (line) => `<li style="margin-bottom:8px">${esc(line)}</li>`,
  ).join("");

  const eyebrow =
    "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";

  return page(`<p style="${eyebrow}">Leaderboard</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(market)} companies with the most insider buying</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">The companies whose own ${market === "US" ? "insiders" : "directors"} bought most often over the last twelve months — with how many different people were buying, because one person buying twelve times and twelve people buying once are the same number and not the same signal.</p>
  <p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(trackingNotice(market))}</p>
  ${complete ? "" : `<p style="font-size:13px;color:#6b6154">We couldn’t load the whole period, so these counts may be missing older purchases.</p>`}
  <p style="font-size:14px;color:#4a4034;max-width:62ch">${esc(qualifying)} companies reached ${esc(MIN_COMPANY_FILINGS)} or more qualifying purchases in the last twelve months; the ${rows.length} busiest are listed here.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">#</th>
    <th style="text-align:left;padding:8px 12px">Company</th>
    <th style="text-align:left;padding:8px 12px">Purchases</th>
    <th style="text-align:left;padding:8px 12px">Who bought</th>
    <th style="text-align:left;padding:8px 12px">Combined value</th>
    <th style="text-align:left;padding:8px 12px">Median alpha since</th>
  </tr></thead><tbody>${body}</tbody></table>
  <h2 style="font-size:15px;margin:32px 0 10px">How this is put together</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${method}</ul>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/cluster-buys">Cluster buying</a> · <a href="https://${esc(host)}/biggest-buys">The biggest buys</a> · <a href="https://${esc(host)}/companies">Browse companies</a> · <a href="https://${esc(host)}/sectors">Buying by sector</a></p>`);
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);

  const market = MARKET_BY_HOST[host];

  if (!market) return noindex(shell);

  let dealings;
  let complete;

  try {
    ({ dealings, complete } = await fetchDealingsWindow({
      apiBase: API_BASE,
      market,
      since: windowStart(new Date()),
      until: null,
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 1800, "400-499": 60, "500-599": 0 },
      },
    }));
  } catch {
    return shell;
  }

  const { rows, qualifying } = rankCompanies(dealings, market, TOP_N);

  if (rows.length === 0) return complete ? noindex(shell) : shell;

  const canonical = `https://${host}/most-active-companies`;

  return renderInto(shell, {
    title: brandTitle(`${market} companies with the most insider buying`),
    description: leadSentence(rows, market),
    canonical,
    breadcrumbs: [{ name: "Most-active companies", item: canonical }],
    body: prerender(rows, qualifying, market, host, complete),
  });
}
