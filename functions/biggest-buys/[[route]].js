// Crawler pre-render for the biggest-buys boards.
//
// A catch-all ([[route]]) rather than two Functions, because the rolling board
// (/biggest-buys) and the year archive (/biggest-buys/2026) render the same
// document over a different window — splitting them would duplicate the whole
// renderer to vary one date range.
//
// The ranking, the eligibility rules and the methodology text all come from
// shared/leaderboard.js, the same module the React page uses. That matters more
// here than anywhere else in the site: a leaderboard whose pre-rendered order
// differs from its hydrated order is worse than no leaderboard, and the
// methodology is only credible if the words a crawler reads are the words the
// code enforces.

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import {
  buyAlpha,
  buyPerson,
  buyValue,
  leaderboardPath,
  rankBuys,
  yearBounds,
  METHODOLOGY,
  TOP_N,
} from "../../shared/leaderboard.js";
import {
  esc,
  noindex,
  page,
  renderInto,
} from "../../shared/prerender.js";
import { windowStart } from "../../shared/sectors.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";

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

const signedPct = (r) =>
  r == null ? "n/a" : `${r > 0 ? "+" : ""}${(r * 100).toFixed(1)}%`;

const displayTicker = (t) => String(t ?? "").replace(/\.L$/i, "");

const cleanCompany = (c) =>
  String(c ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

function leadSentence(rows, market, periodLabel) {
  const noun = market === "US" ? "insiders" : "directors";
  const top = rows[0];

  if (!top) return `The largest open-market share purchases by ${market} ${noun}.`;

  return `The ${rows.length} largest open-market purchases ${market} ${noun} made in their own companies ${periodLabel}, led by ${cleanCompany(top.company) || displayTicker(top.ticker)} at ${money(buyValue(top), SYMBOL[market])}.`;
}

function prerender(rows, suppressed, market, periodLabel, host, complete) {
  const symbol = SYMBOL[market];

  const body = rows
    .map(
      (d, i) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}/company/${esc(displayTicker(d.ticker).toLowerCase())}">${esc(cleanCompany(d.company) || displayTicker(d.ticker))}</a></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(buyPerson(d) ?? "—")}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(d.trade_date ?? "")}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(money(buyValue(d), symbol))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(signedPct(buyAlpha(d)))}</td>
    </tr>`,
    )
    .join("");

  const held = [...suppressed.entries()]
    .map(
      ([t, n]) =>
        `${displayTicker(t)} had ${n} further qualifying ${n === 1 ? "purchase" : "purchases"}`,
    )
    .join("; ");

  const method = METHODOLOGY.map(
    (line) => `<li style="margin-bottom:8px">${esc(line)}</li>`,
  ).join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">The biggest ${esc(market)} insider buys ${esc(periodLabel)}</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">The largest open-market purchases ${market === "US" ? "insiders" : "directors"} made in their own companies, with how each has performed against the market since it was disclosed.</p>
  ${complete ? "" : `<p style="font-size:13px;color:#6b6154">We couldn’t load the whole period, so this ranking may be missing older purchases.</p>`}
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">#</th>
    <th style="text-align:left;padding:8px 12px">Company</th>
    <th style="text-align:left;padding:8px 12px">Bought by</th>
    <th style="text-align:left;padding:8px 12px">Date</th>
    <th style="text-align:left;padding:8px 12px">Value</th>
    <th style="text-align:left;padding:8px 12px">Alpha since</th>
  </tr></thead><tbody>${body}</tbody></table>
  ${held ? `<p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(held)}, held back so a single company doesn’t fill the board.</p>` : ""}
  <h2 style="font-size:15px;margin:32px 0 10px">How this is put together</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${method}</ul>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/sectors">Buying by sector</a> · <a href="https://${esc(host)}/companies">Browse companies</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);

  // [[route]] gives the trailing segments; the bare board has none.
  const rest = params.route;
  const segments = Array.isArray(rest) ? rest : rest ? [rest] : [];

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (segments.length > 1) return noindex(shell);

  const year = segments[0] ?? null;
  const bounds = year ? yearBounds(year) : null;

  // A year segment that isn't a year.
  if (year && !bounds) return noindex(shell);

  const market = MARKET_BY_HOST[host];

  if (!market) return noindex(shell);

  const since = bounds ? bounds.since : windowStart(new Date());
  const { dealings, complete } = await fetchDealingsWindow({
    apiBase: API_BASE,
    market,
    since,
    until: bounds ? bounds.until : null,
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 1800, "400-499": 60, "500-599": 0 },
    },
  });

  const { rows, suppressed } = rankBuys(dealings, market, TOP_N);

  // An empty board is a stub — don't index one.
  if (rows.length === 0) return noindex(shell);

  const periodLabel = year ? `in ${year}` : "of the last twelve months";
  const canonical = `https://${host}${leaderboardPath(year)}`;
  const title = brandTitle(
    `The biggest ${market} insider buys ${periodLabel}`,
  );

  return renderInto(shell, {
    title,
    description: leadSentence(rows, market, periodLabel),
    canonical,
    breadcrumbs: year
      ? [
          { name: "Biggest buys", item: `https://${host}/biggest-buys` },
          { name: year, item: canonical },
        ]
      : [{ name: "Biggest buys", item: canonical }],
    body: prerender(rows, suppressed, market, periodLabel, host, complete),
  });
}
