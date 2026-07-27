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
  archiveYears,
  buyAlpha,
  buyPerson,
  buyReturn,
  buyValue,
  leaderboardPath,
  rankBuys,
  yearBounds,
  BOARD_EARLIEST_YEAR,
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
// The same sentence TrackingNotice prints on the hydrated page. Read from
// shared/ rather than mirrored here: a crawler reading a twelve-month claim
// with nothing qualifying it is the divergence that matters most, and a copy of
// the sentence is a copy that can go stale when the coverage floor moves.
import { TRACKING_NOTICE } from "../../shared/tracking.js";

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

/** Alpha is a difference between two returns, so the unit is percentage
 *  points. Same string the hydrated board's badge prints. */
const signedPp = (r) =>
  r == null ? "n/a" : `${r > 0 ? "+" : ""}${(r * 100).toFixed(1)}pp`;

const displayTicker = (t) => String(t ?? "").replace(/\.L$/i, "");

/** Mirrors cleanCompanyName in src/lib/company.ts, loop and all: names
 *  routinely carry TWO trailing parentheticals — "Jardine Matheson Holdings
 *  Ltd (Singapore Reg) (JAR)" — and the single pass this used to do stripped
 *  only the ticker, so the crawler read a longer name than the reader did. */
const cleanCompany = (c) => {
  let out = String(c ?? "").trim();

  for (;;) {
    const next = out
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
      .trim();

    // Never strip the whole name away: a company literally called "(BLANK)"
    // should render as it arrived rather than as an empty cell.
    if (next === out || next === "") return out;
    out = next;
  }
};

/** Mirrors cleanInsiderName in src/lib/company.ts — the UK feed files the whole
 *  beneficial-ownership chain, and the board printed it raw here while the page
 *  cut it back. */
const cleanInsider = (n) => {
  const out = String(n ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

  return out || String(n ?? "").trim();
};

/** The summary the hydrated board states in tiles above the table. */
function summaryLine(rows, symbol) {
  const total = rows.reduce((sum, d) => sum + buyValue(d), 0);
  const companies = new Set(rows.map((d) => d.ticker ?? "")).size;
  const alphas = rows
    .map((d) => buyAlpha(d))
    .filter((a) => a != null)
    .sort((a, b) => a - b);
  const mid = Math.floor(alphas.length / 2);
  const median =
    alphas.length === 0
      ? null
      : alphas.length % 2 === 1
        ? alphas[mid]
        : (alphas[mid - 1] + alphas[mid]) / 2;

  // The median's denominator, in the same words the hydrated tiles use: a
  // median alpha over 25 rows can rest on the handful of them old enough to
  // have a mark, and stating the figure without the sample size overstates it.
  return `${rows.length} purchases, ${money(total, symbol)} in total, across ${companies} ${companies === 1 ? "company" : "companies"}. Median alpha since disclosure: ${signedPp(median)}. ${alphas.length} of ${rows.length} buys have a performance mark; the median is taken from those.`;
}

function leadSentence(rows, market, periodLabel) {
  const noun = market === "US" ? "insiders" : "directors";
  const top = rows[0];

  if (!top) return `The largest open-market share purchases by ${market} ${noun}.`;

  return `The ${rows.length} largest open-market purchases ${market} ${noun} made in their own companies ${periodLabel}, led by ${cleanCompany(top.company) || displayTicker(top.ticker)} at ${money(buyValue(top), SYMBOL[market])}.`;
}

function prerender(rows, suppressed, market, periodLabel, host, complete, year) {
  const symbol = SYMBOL[market];

  // The year boards are the archive and the rolling board is canonical, so the
  // links run in both directions — a crawler that lands on /biggest-buys/2026
  // needs a route back to the live one, and the sitemap's year URLs need an
  // internal link behind them rather than standing on the sitemap alone.
  const boards = [
    ...(year
      ? [`<a href="https://${esc(host)}/biggest-buys">The last twelve months</a>`]
      : []),
    ...archiveYears(BOARD_EARLIEST_YEAR, new Date())
      .filter((y) => String(y) !== String(year))
      .map(
        (y) =>
          `<a href="https://${esc(host)}${leaderboardPath(y)}">Biggest buys of ${y}</a>`,
      ),
  ].join(" · ");

  const cell = "padding:8px 12px;border-bottom:1px solid #ece1cf";
  const quiet = "display:block;font-size:12px;color:#6b6154;margin-top:2px";

  const body = rows
    .map((d, i) => {
      const value = buyValue(d);
      const ret = buyReturn(d);
      const worth = ret != null && value > 0 ? value * (1 + ret) : null;

      return `<tr>
      <td style="${cell}">${i + 1}</td>
      <td style="${cell}"><a href="https://${esc(host)}/company/${esc(displayTicker(d.ticker).toLowerCase())}">${esc(cleanCompany(d.company) || displayTicker(d.ticker))}</a>${
        d.cluster
          ? `<span style="${quiet}">Part of a cluster of ${esc(d.cluster.count)} insiders</span>`
          : ""
      }</td>
      <td style="${cell}">${esc(cleanInsider(buyPerson(d)) || "—")}</td>
      <td style="${cell}">${esc(d.trade_date ?? "")}</td>
      <td style="${cell}">${esc(money(value, symbol))}${
        worth != null && worth > 0
          ? `<span style="${quiet}">worth ${esc(money(worth, symbol))} if still held</span>`
          : ""
      }</td>
      <td style="${cell}">${esc(signedPp(buyAlpha(d)))}</td>
    </tr>`;
    })
    .join("");

  const held = [...suppressed.entries()]
    .map(([t, n]) => `${displayTicker(t)} (${n} more)`)
    .join(", ");

  const method = METHODOLOGY.map(
    (line) => `<li style="margin-bottom:8px">${esc(line)}</li>`,
  ).join("");

  const eyebrow = "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";

  return page(`<p style="${eyebrow}">Leaderboard</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">The biggest ${esc(market)} insider buys ${esc(periodLabel)}</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">The largest <a href="https://${esc(host)}/learn/open-market-buy">open-market purchases</a> ${market === "US" ? "insiders" : "directors"} made in their own companies, ranked by what they spent, with how each has performed against the market since it was disclosed.</p>
  <p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(TRACKING_NOTICE)}</p>
  ${complete ? "" : `<p style="font-size:13px;color:#6b6154">We couldn’t load the whole period, so this ranking may be missing older purchases.</p>`}
  <p style="font-size:14px;color:#4a4034;max-width:62ch">${esc(summaryLine(rows, symbol))}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">#</th>
    <th style="text-align:left;padding:8px 12px">Company</th>
    <th style="text-align:left;padding:8px 12px">Bought by</th>
    <th style="text-align:left;padding:8px 12px">Date</th>
    <th style="text-align:left;padding:8px 12px">Value bought</th>
    <th style="text-align:left;padding:8px 12px">Alpha since disclosure</th>
  </tr></thead><tbody>${body}</tbody></table>
  ${held ? `<p style="font-size:13px;color:#6b6154;max-width:62ch">Held back so one company can’t fill the board: ${esc(held)}.</p>` : ""}
  <h2 style="font-size:15px;margin:32px 0 10px">How this is put together</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${method}</ul>
  ${boards ? `<h2 style="font-size:15px;margin:32px 0 10px">Boards by year</h2><p style="font-size:14px">${boards}</p>` : ""}
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/sectors">Buying by sector</a> · <a href="https://${esc(host)}/companies">Browse companies</a> · <a href="https://${esc(host)}/learn/open-market-buy">Open-market buys</a> · <a href="https://${esc(host)}/learn/cluster-buying">Cluster buying</a></p>`);
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
  let dealings;
  let complete;

  try {
    ({ dealings, complete } = await fetchDealingsWindow({
      apiBase: API_BASE,
      market,
      since,
      until: bounds ? bounds.until : null,
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 1800, "400-499": 60, "500-599": 0 },
      },
    }));
  } catch {
    // A pre-render failing should cost the injected content, not the page —
    // same posture as fetchJson in shared/prerender.js. The shell is a working
    // SPA; a 500 here would lose the URL outright.
    return shell;
  }

  const { rows, suppressed } = rankBuys(dealings, market, TOP_N);

  // An empty board is a stub — don't index one. But a failed fetch produces the
  // same empty board, and `complete` is the only thing that tells them apart:
  // Googlebot arriving during an API incident is exactly when this fires, and
  // noindexing then is us asking for a ranking URL to be dropped over a blip.
  // Serve the shell untouched instead and let the next crawl settle it.
  if (rows.length === 0) return complete ? noindex(shell) : shell;

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
    body: prerender(
      rows,
      suppressed,
      market,
      periodLabel,
      host,
      complete,
      year,
    ),
  });
}
