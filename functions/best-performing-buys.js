// Crawler pre-render for the best-performing-buys board.
//
// The ranking, the floor, the per-company cap and the methodology text all come
// from shared/boards.js — the same module the React page uses. That matters
// more on a performance board than anywhere else on the site: the page names
// specific companies as having beaten the market, and a crawler reading a
// different set from the one a visitor sees is the divergence that turns a
// ranking into a claim nobody can check.

import { fetchDealingsWindow } from "../shared/dealings-feed.js";
import {
  rankByAlpha,
  summarise,
  MIN_BOARD_VALUE,
  PERFORMANCE_METHODOLOGY,
  TOP_N,
} from "../shared/boards.js";
import { buyAlpha, buyPerson, buyValue } from "../shared/leaderboard.js";
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

/** Mirrors cleanCompanyName in src/lib/company.ts — names routinely carry two
 *  trailing parentheticals, so this loops rather than stripping once. */
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

const cleanInsider = (n) => {
  const out = String(n ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

  return out || String(n ?? "").trim();
};

function leadSentence(rows, market, symbol) {
  const noun = market === "US" ? "insiders" : "directors";
  const top = rows[0];

  if (!top)
    return `Open-market purchases by ${market} ${noun}, ranked by how far they have beaten the market.`;

  return `The ${rows.length} open-market purchases ${market} ${noun} made in their own companies that have beaten the market by the widest margin over the last twelve months, led by ${cleanCompany(top.company) || displayTicker(top.ticker)} at ${signedPp(buyAlpha(top))}. Purchases under ${money(MIN_BOARD_VALUE, symbol)} are excluded.`;
}

function prerender(rows, suppressed, considered, market, host, complete) {
  const symbol = SYMBOL[market];
  const summary = summarise(rows);
  const floor = money(MIN_BOARD_VALUE, symbol);

  const cell = "padding:8px 12px;border-bottom:1px solid #ece1cf";
  const quiet = "display:block;font-size:12px;color:#6b6154;margin-top:2px";

  const body = rows
    .map((d, i) => {
      const role = d?.director?.role ?? d?.reporter?.officer_title ?? "";

      return `<tr>
      <td style="${cell}">${i + 1}</td>
      <td style="${cell}"><a href="https://${esc(host)}/company/${esc(displayTicker(d.ticker).toLowerCase())}">${esc(cleanCompany(d.company) || displayTicker(d.ticker))}</a>${
        d.cluster
          ? `<span style="${quiet}">Part of a cluster of ${esc(d.cluster.count)} insiders</span>`
          : ""
      }</td>
      <td style="${cell}">${esc(cleanInsider(buyPerson(d)) || "—")}${
        role ? `<span style="${quiet}">${esc(role)}</span>` : ""
      }</td>
      <td style="${cell}">${esc(d.trade_date ?? "")}</td>
      <td style="${cell}">${esc(money(buyValue(d), symbol))}</td>
      <td style="${cell}">${esc(signedPp(buyAlpha(d)))}</td>
    </tr>`;
    })
    .join("");

  const held = [...suppressed.entries()]
    .map(([t, n]) => `${displayTicker(t)} (${n} more)`)
    .join(", ");

  const method = PERFORMANCE_METHODOLOGY.map(
    (line) => `<li style="margin-bottom:8px">${esc(line)}</li>`,
  ).join("");

  const eyebrow =
    "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";

  return page(`<p style="${eyebrow}">Leaderboard</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">The best-performing ${esc(market)} insider buys of the last year</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">The purchases ${market === "US" ? "insiders" : "directors"} made in their own companies that have since beaten the market by the widest margin, measured as alpha — the share's own move minus the index's over the same period, so a rising market doesn't flatter the whole board.</p>
  <p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(trackingNotice(market))}</p>
  ${complete ? "" : `<p style="font-size:13px;color:#6b6154">We couldn’t load the whole period, so this ranking may be missing older purchases.</p>`}
  <p style="font-size:14px;color:#4a4034;max-width:62ch">Ranked from the ${considered} purchases in the last twelve months that clear the ${esc(floor)} floor and have a performance mark. Best on the board: ${esc(signedPp(buyAlpha(rows[0])))}; median of the ${rows.length} listed: ${esc(signedPp(summary.medianAlpha))}, across ${summary.companies} ${summary.companies === 1 ? "company" : "companies"}.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">#</th>
    <th style="text-align:left;padding:8px 12px">Company</th>
    <th style="text-align:left;padding:8px 12px">Bought by</th>
    <th style="text-align:left;padding:8px 12px">Date</th>
    <th style="text-align:left;padding:8px 12px">Value bought</th>
    <th style="text-align:left;padding:8px 12px">Alpha since disclosure</th>
  </tr></thead><tbody>${body}</tbody></table>
  ${held ? `<p style="font-size:13px;color:#6b6154;max-width:62ch">Held back so one company can’t fill the board: ${esc(held)}.</p>` : ""}
  <p style="font-size:13px;color:#6b6154;max-width:62ch">Purchases under ${esc(floor)} are excluded. A token buy in a thinly traded company moves much further than a real one.</p>
  <h2 style="font-size:15px;margin:32px 0 10px">How this is put together</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${method}</ul>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/biggest-buys">The biggest buys</a> · <a href="https://${esc(host)}/cluster-buys">Cluster buying</a> · <a href="https://${esc(host)}/sectors">Buying by sector</a> · <a href="https://${esc(host)}/learn/open-market-buy">Open-market buys</a></p>`);
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
    // A pre-render failing should cost the injected content, not the page.
    return shell;
  }

  const { rows, suppressed, considered } = rankByAlpha(dealings, market, TOP_N);

  // An empty board is a stub; a failed fetch produces the same empty board.
  // `complete` is the only thing that tells them apart, and noindexing during
  // an API incident is us asking for a ranking URL to be dropped over a blip.
  if (rows.length === 0) return complete ? noindex(shell) : shell;

  const canonical = `https://${host}/best-performing-buys`;

  return renderInto(shell, {
    title: brandTitle(
      `The best-performing ${market} insider buys of the last year`,
    ),
    description: leadSentence(rows, market, SYMBOL[market]),
    canonical,
    breadcrumbs: [{ name: "Best-performing buys", item: canonical }],
    body: prerender(
      rows,
      suppressed,
      considered,
      market,
      host,
      complete,
    ),
  });
}
