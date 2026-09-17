// Crawler pre-render for the Insider Index: /insider-index.
//
// The reading, the sentence and the methodology come from
// shared/insider-index.js, the same module the React page and the daily
// edition use. Read its header before touching anything here: the index is
// buying against its own record, not net buying, because the feeds carry no
// sells, and the page says so in the first line under the figure.
//
// UK on every host. The page canonicalises to ddbx.uk (shared/seo.js folds it
// there, as it does the broker guides), so a ddbx.us request pre-renders the
// same UK document with the same canonical rather than a US one that does not
// exist.

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import {
  dateLabel,
  feedGap,
  FEED_GAP_LIMIT,
  indexLeadSentence,
  indexPath,
  INDEX_METHODOLOGY,
  latestReading,
  METHOD_LABEL,
  publishable,
  publishedThrough,
  readingSentence,
  series,
  windowSentence,
} from "../../shared/insider-index.js";
import { esc, noindex, page, renderInto } from "../../shared/prerender.js";
import { windowStart } from "../../shared/sectors.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";
import { trackingNotice } from "../../shared/tracking.js";

const API_BASE = "https://api.ddbx.uk/api";
const HOST = "ddbx.uk";
const MARKET = "UK";

/** How many recent readings the pre-render lists as links. Same as the
 *  hydrated page. */
const RECENT = 15;

const EYEBROW =
  "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";
const CELL = "padding:8px 12px;border-bottom:1px solid #ece1cf";

export function methodologyHtml() {
  return INDEX_METHODOLOGY.map(
    (line) => `<li style="margin-bottom:8px">${esc(line)}</li>`,
  ).join("");
}

export function readingRows(rows) {
  return rows
    .map(
      (r) => `<tr>
      <td style="${CELL}"><a href="https://${HOST}${esc(indexPath(r.date))}">${esc(dateLabel(r.date))}</a></td>
      <td style="${CELL}">${esc(r.score)}</td>
      <td style="${CELL}">${esc(r.tier?.label ?? "")}</td>
      <td style="${CELL}">${esc(r.count)} purchases, ${esc(r.breadth)} companies</td>
    </tr>`,
    )
    .join("");
}

export async function loadSeries() {
  const { dealings, complete } = await fetchDealingsWindow({
    apiBase: API_BASE,
    market: MARKET,
    since: windowStart(new Date()),
    until: null,
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 900, "400-499": 60, "500-599": 0 },
    },
  });
  const all = series(dealings, MARKET);

  return {
    all,
    complete,
    gap: feedGap(dealings, publishedThrough(), MARKET),
  };
}

/** The method and the revision posture, said on every reading. */
export function methodNote() {
  return `<p style="font-size:13px;color:#6b6154;max-width:62ch">Method ${esc(METHOD_LABEL)}. A day’s reading publishes at 7am London time the next morning. Readings may be revised when a late filing or a backfill reaches the record.</p>`;
}

export function caveats(complete, gap) {
  return [
    complete
      ? ""
      : `<p style="font-size:13px;color:#6b6154;max-width:62ch">We couldn’t load the whole record, so readings may be ranked against fewer earlier windows than they should be.</p>`,
    gap >= FEED_GAP_LIMIT
      ? `<p style="font-size:13px;color:#6b6154;max-width:62ch">No disclosure has reached the record for ${esc(gap)} trading days, so treat the latest readings as provisional until the feed resumes.</p>`
      : "",
  ].join("");
}

function prerender(all, latest, complete, gap) {
  const i = all.indexOf(latest);
  const published = publishable(all);
  const recent = [...published].reverse().slice(0, RECENT);

  return page(`<p style="${EYEBROW}">Insider Index</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">The UK Insider Index</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">One number for how much UK directors are buying, published every trading day: the last twenty sessions of open-market purchases, ranked against every earlier day on record. 50 is normal, 100 is busier than every earlier day, 0 quieter.</p>
  <p style="font-size:44px;font-weight:600;line-height:1;margin:24px 0 4px">${esc(latest.score)}<span style="font-size:14px;font-weight:400;color:#6b6154"> / 100 · ${esc(latest.tier.label)}</span></p>
  <p style="font-size:13px;color:#6b6154;margin:0 0 12px">Reading for ${esc(dateLabel(latest.date))}</p>
  <p style="font-size:16px;line-height:1.6;color:#4a4034;max-width:62ch">${esc(readingSentence(all, i, MARKET))} ${esc(windowSentence(latest, MARKET))}</p>
  <p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(trackingNotice(MARKET))} The index is buying against its own record, not net of selling: the record holds purchases only.</p>
  ${methodNote()}
  ${caveats(complete, gap)}
  <h2 style="font-size:15px;margin:32px 0 10px">Recent readings</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Day</th>
    <th style="text-align:left;padding:8px 12px">Reading</th>
    <th style="text-align:left;padding:8px 12px">Tier</th>
    <th style="text-align:left;padding:8px 12px">The twenty days behind it</th>
  </tr></thead><tbody>${readingRows(recent)}</tbody></table>
  <h2 style="font-size:15px;margin:32px 0 10px">How it is calculated</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${methodologyHtml()}</ul>
  <p style="margin-top:24px;font-size:14px"><a href="https://${HOST}/weekly">Week by week</a> · <a href="https://${HOST}/cluster-buys">Cluster buying</a> · <a href="https://${HOST}/most-active-companies">Most-active companies</a> · <a href="https://${HOST}/learn/what-a-director-buy-signals">What a director buy signals</a></p>`);
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);

  let loaded;

  try {
    loaded = await loadSeries();
  } catch {
    return shell;
  }
  const { all, complete, gap } = loaded;
  const latest = latestReading(all);

  // Nothing published yet is a fact about the record's length, not an
  // outage — but only when the fetch finished. A partial fetch that produced
  // no readings is an outage.
  if (!latest) return complete ? noindex(shell) : shell;

  const canonical = `https://${HOST}${indexPath()}`;

  return renderInto(shell, {
    title: brandTitle(
      `The UK Insider Index — how much directors are buying, daily`,
    ),
    description: indexLeadSentence(all, MARKET),
    canonical,
    breadcrumbs: [{ name: "Insider Index", item: canonical }],
    body: prerender(all, latest, complete, gap),
  });
}
