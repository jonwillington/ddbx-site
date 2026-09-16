// Crawler pre-render for the stock index: /congress/stocks.
//
// The hub every ticker page hangs off, so it carries the full published list
// rather than a sample — a crawler reaches every stock page from one place.
//
// No fetch: the list is the generated roster (shared/congress-stocks-roster.js)
// that the React page and the sitemap read, so the three cannot disagree
// about which pages exist. See the roster script for why it is a snapshot.

import { CONGRESS_NOTICE, CONGRESS_SOURCE } from "../../../shared/congress.js";
import {
  longDate,
  MIN_STOCK_MEMBERS,
  MIN_STOCK_ROWS,
  publishedRoster,
  PURCHASES_ONLY_NOTE,
  STOCKS_INDEX_PATH,
  stockPath,
  stocksIndexLead,
} from "../../../shared/congress-stocks.js";
import {
  ROSTER,
  ROSTER_AS_OF,
  ROSTER_CORPUS,
} from "../../../shared/congress-stocks-roster.js";
import { apexHost, esc, noindex, page, renderInto } from "../../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../../shared/seo.js";

const OWNING_HOST = "ddbx.us";

export const STOCKS_INDEX_TITLE = "The stocks members of Congress buy";

function prerender(host) {
  const published = publishedRoster(ROSTER);
  const rows = published
    .map(
      (e) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}${esc(stockPath(e.t))}">${esc(e.c)}</a></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(e.t)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${e.m}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${e.r}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(e.last ?? "")}</td>
    </tr>`,
    )
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(STOCKS_INDEX_TITLE)}</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(stocksIndexLead(ROSTER, ROSTER_CORPUS))}</p>
  <p style="font-size:14px;color:#6b6154">${published.length} stocks with a page · ${ROSTER_CORPUS.members} members · ${ROSTER_CORPUS.rows} purchases · counts as of ${esc(longDate(ROSTER_AS_OF))}</p>
  <p style="font-size:13px;line-height:1.55;color:#6b6154;max-width:66ch">${esc(PURCHASES_ONLY_NOTE)} A stock gets a page once at least ${MIN_STOCK_MEMBERS} members and ${MIN_STOCK_ROWS} purchases are on record. ${esc(CONGRESS_NOTICE)}</p>
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
  // A hub with nothing in it must not be advertised.
  if (publishedRoster(ROSTER).length === 0) return noindex(shell);

  const canonical = `https://${OWNING_HOST}${STOCKS_INDEX_PATH}`;

  return renderInto(shell, {
    title: brandTitle(STOCKS_INDEX_TITLE),
    description: stocksIndexLead(ROSTER, ROSTER_CORPUS),
    canonical,
    breadcrumbs: [
      { name: "Congress", item: `https://${OWNING_HOST}/congress` },
      { name: "Stocks", item: canonical },
    ],
    body: prerender(OWNING_HOST),
  });
}
