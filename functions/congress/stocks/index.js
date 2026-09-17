// Crawler pre-render for the stock index: /congress/stocks.
//
// The hub every ticker page hangs off, so it carries the full published list
// rather than a sample — a crawler reaches every stock page from one place.
//
// The list is /api/gov-stocks, which the React page, the sitemap and every
// ticker page's bar also read, so the four cannot disagree about which pages
// exist. A failed fetch serves the plain shell (React renders its own failure
// state); only a real answer with nothing to list is noindexed.

import { CONGRESS_NOTICE, CONGRESS_SOURCE } from "../../../shared/congress.js";
import {
  cleanIssuer,
  longDate,
  MIN_STOCK_MEMBERS,
  MIN_STOCK_ROWS,
  PURCHASES_ONLY_NOTE,
  readStocks,
  STOCKS_API_PATH,
  STOCKS_INDEX_PATH,
  stockPath,
  stocksIndexLead,
} from "../../../shared/congress-stocks.js";
import {
  apexHost,
  esc,
  fetchJsonWithStatus,
  noindex,
  page,
  renderInto,
} from "../../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
const OWNING_HOST = "ddbx.us";

export const STOCKS_INDEX_TITLE = "The stocks members of Congress buy";

function prerender(roster, published, host) {
  const rows = published
    .map(
      (e) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}${esc(stockPath(e.ticker))}">${esc(cleanIssuer(e.company))}</a></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(e.ticker)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${e.members}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${e.purchases}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(e.last_disclosed ?? "")}</td>
    </tr>`,
    )
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(STOCKS_INDEX_TITLE)}</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(stocksIndexLead(roster))}</p>
  <p style="font-size:14px;color:#6b6154">${published.length} stocks with a page · ${roster.corpus.members} members · ${roster.corpus.purchases} purchases${roster.as_of ? ` · latest filing ${esc(longDate(roster.as_of))}` : ""}</p>
  <p style="font-size:13px;line-height:1.55;color:#6b6154;max-width:66ch">${esc(PURCHASES_ONLY_NOTE)} A stock gets a page once at least ${MIN_STOCK_MEMBERS} members and ${MIN_STOCK_ROWS} purchases are on record. Funds and ETFs are left out of this list. ${esc(CONGRESS_NOTICE)}</p>
  <h2 style="font-size:15px;margin:32px 0 8px">Every stock with a page</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Company</th>
    <th style="text-align:left;padding:8px 12px">Ticker</th>
    <th style="text-align:left;padding:8px 12px">Members</th>
    <th style="text-align:left;padding:8px 12px">Purchases</th>
    <th style="text-align:left;padding:8px 12px">Last filed</th>
  </tr></thead><tbody>${rows}</tbody></table>
  <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#6b6154;max-width:66ch">${esc(CONGRESS_SOURCE)}</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/congress/members">By member</a> · <a href="https://${esc(host)}/congress/committees">By committee</a> · <a href="https://${esc(host)}/congress">Latest filings</a> · <a href="https://${esc(host)}/learn/stock-act">What the STOCK Act requires</a></p>`);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (host !== OWNING_HOST) return noindex(shell);

  const res = await fetchJsonWithStatus(`${API_BASE}${STOCKS_API_PATH}`, 3600);
  const read = readStocks(res.data);

  // Failed is not empty: a noindex served on a bad minute outlives the
  // outage by weeks, so a failed fetch (any status: a 404 from a list route
  // is an outage, not an answer) serves the shell untouched.
  if (read.state === "failed") return shell;
  // A hub with nothing in it must not be advertised.
  if (read.state === "empty") return noindex(shell);

  const canonical = `https://${OWNING_HOST}${STOCKS_INDEX_PATH}`;

  return renderInto(shell, {
    title: brandTitle(STOCKS_INDEX_TITLE),
    description: stocksIndexLead(read.roster),
    canonical,
    breadcrumbs: [
      { name: "Congress", item: `https://${OWNING_HOST}/congress` },
      { name: "Stocks", item: canonical },
    ],
    body: prerender(read.roster, read.published, OWNING_HOST),
  });
}
