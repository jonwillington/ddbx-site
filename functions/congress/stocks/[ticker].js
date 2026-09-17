// Crawler pre-render for a Congress-by-stock page: /congress/stocks/nvda.
//
// Every sentence here comes from shared/congress-stocks.js, which is also what
// the React page renders. Hard requirement on this family: these pages name
// sitting legislators, and a crawler reading a qualification the visitor never
// sees (or the reverse) is how a page ends up making a claim nobody wrote.
//
// ddbx.us only, like the rest of /congress/*. Served elsewhere it renders (a
// link must not 404) but is noindexed.
//
// Two fetches, two jobs. The rows (/api/gov-dealings?ticker=) decide what the
// page says. The ticker's /api/gov-stocks entry decides whether it is indexed
// and supplies every buyer's committee lane: the hub and the sitemap read the
// same entry, so a ticker is never advertised and then noindexed here, and the
// lane is the rating engine's, never recomputed. A fund over the bar renders
// in full but stays noindexed, like it stays out of the hub and the sitemap.

import {
  band,
  committeePath,
  committeeSlug,
  CONGRESS_NOTICE,
  CONGRESS_SOURCE,
  memberPath,
  memberSlug,
} from "../../../shared/congress.js";
import {
  belowBarSentence,
  clusterNote,
  laneSentence,
  memberLaneLine,
  optionsNote,
  PURCHASES_ONLY_NOTE,
  readStocks,
  relatedTickers,
  STOCK_FETCH_LIMIT,
  STOCK_ROWS,
  STOCKS_API_PATH,
  STOCKS_INDEX_PATH,
  stockEntry,
  stockLeadSentence,
  stockMeetsBar,
  stockPath,
  stockPublished,
  stockRollup,
  stockVerdict,
  tickerFromSlug,
  truncatedNote,
} from "../../../shared/congress-stocks.js";
import {
  apexHost,
  esc,
  fetchJsonWithStatus,
  noindex,
  page,
  renderInto,
  unresolved,
} from "../../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
const OWNING_HOST = "ddbx.us";

/** Title template. "Stock purchases" rather than "trades": the page shows
 *  purchases only and says so, and a title promising trades would be the one
 *  line on the page that overstated it. */
export const stockTitle = (s) =>
  `${s.company} (${s.ticker}) stock purchases by members of Congress`;

export const stockDescription = (s) =>
  `${stockLeadSentence(s)} Who bought, when, in what bands, and which of them sit on a committee that oversees the sector.`;

const CELL = 'style="padding:8px 12px;border-bottom:1px solid #ece1cf"';

function prerender(s, rows, entry, stocks, host) {
  const verdict = stockMeetsBar(entry) ? stockVerdict(s) : belowBarSentence(s);
  const notes = [
    PURCHASES_ONLY_NOTE,
    optionsNote(s),
    clusterNote(s),
    truncatedNote(s),
  ].filter(Boolean);

  const members = s.members
    .map(
      (m) =>
        `<li style="margin:0 0 6px"><a href="https://${esc(host)}${esc(memberPath(memberSlug(m.name, m.id)))}">${esc(m.name)}</a> — ${m.rows} ${m.rows === 1 ? "purchase" : "purchases"}, ${esc(band(m.total_min, m.total_max))}. ${esc(memberLaneLine(m))}</li>`,
    )
    .join("");

  const lanes = s.lane.committees
    .map(
      (c) =>
        `<li style="margin:0 0 6px"><a href="https://${esc(host)}${esc(committeePath(committeeSlug(c.committee)))}">${esc(c.committee)}</a> — ${esc(c.members.map((m) => m.name).join(", "))}</li>`,
    )
    .join("");

  const bands = s.bands
    .map(
      (t) =>
        `<li style="margin:0 0 4px">${esc(band(t.min, t.max))}: ${t.count} ${t.count === 1 ? "purchase" : "purchases"}</li>`,
    )
    .join("");

  const purchases = rows
    .slice(0, STOCK_ROWS)
    .map(
      (d) => `<tr>
      <td ${CELL}><a href="https://${esc(host)}${esc(memberPath(memberSlug(d.reporter.name, d.reporter.id)))}">${esc(d.reporter.name)}</a></td>
      <td ${CELL}>${esc(d.trade_date)}</td>
      <td ${CELL}>${esc(d.disclosed_date)}${d.is_late ? " (late)" : ""}</td>
      <td ${CELL}>${esc(band(d.amount_min ?? 0, d.amount_max ?? 0))}</td>
      <td ${CELL}>${esc(d.owner)}</td>
    </tr>`,
    )
    .join("");

  const related = relatedTickers(stocks, s.ticker, 4)
    .map(
      (e) =>
        `<li style="margin:0 0 4px"><a href="https://${esc(host)}${esc(stockPath(e.ticker))}">${esc(e.company)} (${esc(e.ticker)})</a> — ${e.members} members, ${e.purchases} purchases</li>`,
    )
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(s.company)} (${esc(s.ticker)}) — members of Congress who bought it</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(stockLeadSentence(s))}</p>
  <h2 style="font-size:15px;margin:24px 0 8px">${stockMeetsBar(entry) ? "The verdict" : "Not enough data yet"}</h2>
  <p style="font-size:15px;line-height:1.65;max-width:68ch">${esc(verdict)}</p>
  <h2 style="font-size:15px;margin:24px 0 8px">How to read this</h2>
  <ul style="font-size:14px;line-height:1.6;color:#5a4d3a;max-width:66ch;padding-left:18px">${notes.map((n) => `<li style="margin:0 0 6px">${esc(n)}</li>`).join("")}</ul>
  <p style="font-size:14px;color:#6b6154">${s.members.length} ${s.members.length === 1 ? "member" : "members"} · ${s.rows} ${s.rows === 1 ? "purchase" : "purchases"} · ${esc(band(s.total_min, s.total_max))} at the disclosed bands${s.lag.median != null ? ` · median ${Math.round(s.lag.median)} days from trade to filing` : ""}</p>
  <p style="font-size:13px;line-height:1.55;color:#6b6154;max-width:66ch">${esc(CONGRESS_NOTICE)}</p>

  <h2 style="font-size:15px;margin:32px 0 8px">The members</h2>
  <ul style="font-size:14px;line-height:1.6;padding-left:18px">${members}</ul>

  <h2 style="font-size:15px;margin:32px 0 8px">Committee jurisdiction</h2>
  <p style="font-size:14px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(laneSentence(s))}</p>
  ${lanes ? `<ul style="font-size:14px;line-height:1.6;padding-left:18px">${lanes}</ul>` : ""}

  ${bands ? `<h2 style="font-size:15px;margin:32px 0 8px">Disclosed bands</h2><ul style="font-size:14px;line-height:1.6;padding-left:18px">${bands}</ul>` : ""}

  <h2 style="font-size:15px;margin:32px 0 10px">Purchases on record${rows.length > STOCK_ROWS ? ` (most recent ${STOCK_ROWS} of ${rows.length})` : ""}</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Member</th>
    <th style="text-align:left;padding:8px 12px">Traded</th>
    <th style="text-align:left;padding:8px 12px">Filed</th>
    <th style="text-align:left;padding:8px 12px">Band</th>
    <th style="text-align:left;padding:8px 12px">Account</th>
  </tr></thead><tbody>${purchases}</tbody></table>

  ${related ? `<h2 style="font-size:15px;margin:32px 0 8px">Also bought by the same members</h2><ul style="font-size:14px;line-height:1.6;padding-left:18px">${related}</ul>` : ""}

  <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#6b6154;max-width:66ch">${esc(CONGRESS_SOURCE)} Where the site shows a return on a purchase, it runs from the close on the day that filing was published to the latest close we hold, so each purchase is measured over its own holding period and no two are comparable. Past performance is not a reliable indicator of future results.</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}${STOCKS_INDEX_PATH}">Every stock with a page</a> · <a href="https://${esc(host)}/congress/members">By member</a> · <a href="https://${esc(host)}/congress/committees">By committee</a> · <a href="https://${esc(host)}/learn/stock-act">What the STOCK Act requires</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const ticker = tickerFromSlug(
    decodeURIComponent(String(params.ticker ?? "")),
  );

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (host !== OWNING_HOST) return noindex(shell);
  if (!ticker) return noindex(shell);

  const [feed, rosterRes] = await Promise.all([
    fetchJsonWithStatus(
      `${API_BASE}/gov-dealings?view=all&ticker=${encodeURIComponent(ticker)}&limit=${STOCK_FETCH_LIMIT}`,
      900,
    ),
    fetchJsonWithStatus(`${API_BASE}${STOCKS_API_PATH}`, 3600),
  ]);

  // A 5xx or a thrown fetch is not an answer; a noindex served on a bad
  // minute outlives the outage by weeks. Either fetch: without the roster
  // there is no bar to apply and no lane to state.
  if (!feed.data) return unresolved(shell, feed.status);
  const read = readStocks(rosterRes.data);

  // A roster that did not answer, any status, is served as the plain shell:
  // a 404 from a list route says nothing about this ticker.
  if (read.state === "failed") return shell;
  const rows = feed.data.dealings ?? [];

  // An empty result is an answer: nobody in the record bought this. The SPA
  // renders its own not-found state.
  if (rows.length === 0) return noindex(shell);

  const stocks = read.roster.stocks;
  const entry = stockEntry(stocks, ticker);
  const s = stockRollup(ticker, rows, entry);

  if (!s) return noindex(shell);

  // Below the bar the page is a stub: it renders for anyone who follows a
  // link and stays out of the index until there is enough to describe. A
  // fund renders in full and stays out too. Same predicate the hub and the
  // sitemap apply, on the same entry.
  if (!stockPublished(entry)) return noindex(shell);

  // The canonical slug is the lower-cased ticker; a request in upper case
  // resolves and canonicalises here rather than indexing twice.
  const canonical = `https://${OWNING_HOST}${stockPath(ticker)}`;

  return renderInto(shell, {
    title: brandTitle(stockTitle(s)),
    description: stockDescription(s),
    canonical,
    breadcrumbs: [
      { name: "Congress", item: `https://${OWNING_HOST}/congress` },
      { name: "Stocks", item: `https://${OWNING_HOST}${STOCKS_INDEX_PATH}` },
      { name: `${s.company} (${s.ticker})`, item: canonical },
    ],
    body: prerender(s, rows, entry, stocks, OWNING_HOST),
  });
}
