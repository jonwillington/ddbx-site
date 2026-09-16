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
// The bar is applied to the LIVE rows, never to the roster: the roster decides
// what the index advertises, the rows decide what a page says. A ticker in the
// roster above the bar clears it live too (the roster is a sum of the same
// rows); a ticker that crossed since the roster was built is indexable here
// and simply not yet in the sitemap.

import { band, committeePath, committeeSlug, CONGRESS_NOTICE, CONGRESS_SOURCE, memberPath, memberSlug } from "../../../shared/congress.js";
import {
  belowBarSentence,
  clusterNote,
  laneSentence,
  memberLaneLine,
  optionsNote,
  PURCHASES_ONLY_NOTE,
  relatedTickers,
  STOCK_FETCH_LIMIT,
  STOCK_ROWS,
  STOCKS_INDEX_PATH,
  stockLeadSentence,
  stockMeetsBar,
  stockPath,
  stockRollup,
  stockVerdict,
  tickerFromSlug,
  truncatedNote,
} from "../../../shared/congress-stocks.js";
import { ROSTER } from "../../../shared/congress-stocks-roster.js";
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

function prerender(s, rows, host) {
  const verdict = stockMeetsBar(s) ? stockVerdict(s) : belowBarSentence(s);
  const notes = [
    PURCHASES_ONLY_NOTE,
    optionsNote(s),
    clusterNote(s),
    truncatedNote(s),
  ].filter(Boolean);

  const members = s.members
    .map(
      (m) =>
        `<li style="margin:0 0 6px"><a href="https://${esc(host)}${esc(memberPath(memberSlug(m.name, m.id)))}">${esc(m.name)}</a> — ${m.rows} ${m.rows === 1 ? "purchase" : "purchases"}, ${esc(band(m.total_min, m.total_max))}. ${esc(memberLaneLine(m, s.sector))}</li>`,
    )
    .join("");

  const lanes = s.lane.committees
    .map(
      (c) =>
        `<li style="margin:0 0 6px"><a href="https://${esc(host)}${esc(committeePath(committeeSlug(c.committee)))}">${esc(c.committee)}</a> — ${c.members.length ? esc(c.members.map((m) => m.name).join(", ")) : "none of the buyers sit on it"}</li>`,
    )
    .join("");

  const bands = s.bands
    .map((t) => `<li style="margin:0 0 4px">${esc(band(t.min, t.max))}: ${t.count} ${t.count === 1 ? "purchase" : "purchases"}</li>`)
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

  const related = relatedTickers(ROSTER, s.ticker, 4)
    .map(
      (e) =>
        `<li style="margin:0 0 4px"><a href="https://${esc(host)}${esc(stockPath(e.t))}">${esc(e.c)} (${esc(e.t)})</a> — ${e.m} members, ${e.r} purchases</li>`,
    )
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(s.company)} (${esc(s.ticker)}) — members of Congress who bought it</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(stockLeadSentence(s))}</p>
  <h2 style="font-size:15px;margin:24px 0 8px">${stockMeetsBar(s) ? "The verdict" : "Not enough data yet"}</h2>
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

  <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#6b6154;max-width:66ch">${esc(CONGRESS_SOURCE)} Returns shown on the site are measured from the closing price on the day each filing was published and marked to the latest cached close. Past performance is not a reliable indicator of future results.</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}${STOCKS_INDEX_PATH}">Every stock with a page</a> · <a href="https://${esc(host)}/congress/members">By member</a> · <a href="https://${esc(host)}/congress/committees">By committee</a> · <a href="https://${esc(host)}/learn/stock-act">What the STOCK Act requires</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const ticker = tickerFromSlug(decodeURIComponent(String(params.ticker ?? "")));

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (host !== OWNING_HOST) return noindex(shell);
  if (!ticker) return noindex(shell);

  const [feed, lanesRes] = await Promise.all([
    fetchJsonWithStatus(
      `${API_BASE}/gov-dealings?view=all&ticker=${encodeURIComponent(ticker)}&limit=${STOCK_FETCH_LIMIT}`,
      900,
    ),
    fetchJsonWithStatus(`${API_BASE}/gov-committees`, 3600),
  ]);

  // A 5xx or a thrown fetch is not an answer; a noindex served on a bad
  // minute outlives the outage by weeks.
  if (!feed.data) return unresolved(shell, feed.status);
  const rows = feed.data.dealings ?? [];

  // An empty result is an answer: nobody in the record bought this. The SPA
  // renders its own not-found state.
  if (rows.length === 0) return noindex(shell);

  const lanes = new Map(
    (lanesRes.data?.committees ?? []).map((c) => [c.committee, c.sectors]),
  );
  const s = stockRollup(ticker, rows, lanes);

  if (!s) return noindex(shell);

  // Below the bar the page is a stub: it renders for anyone who follows a
  // link and stays out of the index until there is enough to describe. Same
  // bar the React page and the sitemap apply.
  if (!stockMeetsBar(s)) return noindex(shell);

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
    body: prerender(s, rows, OWNING_HOST),
  });
}
