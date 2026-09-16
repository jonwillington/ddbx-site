// Crawler pre-render for one day's Insider Index reading:
// /insider-index/2026-07-02.
//
// Same module, same fetch, same words as functions/insider-index/index.js;
// only the day differs. A slug that is not a trading day is noindexed rather
// than resolved to the nearest one: the URL names a day and the page must
// show that day.

import {
  dateLabel,
  dateLeadSentence,
  indexPath,
  isIndexSlug,
  publishable,
  readingSentence,
  windowSentence,
} from "../../shared/insider-index.js";
import { esc, noindex, page, renderInto } from "../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";
import { trackingNotice } from "../../shared/tracking.js";
import { caveats, loadSeries, methodologyHtml, readingRows } from "./index.js";

const HOST = "ddbx.uk";
const MARKET = "UK";

const EYEBROW =
  "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const slug = decodeURIComponent(String(params.date ?? ""));

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (!isIndexSlug(slug)) return noindex(shell);

  let loaded;

  try {
    loaded = await loadSeries();
  } catch {
    return shell;
  }
  const { all, complete, gap } = loaded;
  const i = all.findIndex((r) => r.date === slug);
  const r = i >= 0 ? all[i] : null;

  // A day with no published reading is an answer once the fetch finished:
  // before the index started, a future date, or a day held back for want of
  // history. A partial fetch is not an answer.
  if (!r || r.score == null) return complete ? noindex(shell) : shell;

  const published = publishable(all);
  const p = published.indexOf(r);
  const older = p > 0 ? published[p - 1] : null;
  const newer = p < published.length - 1 ? published[p + 1] : null;
  const canonical = `https://${HOST}${indexPath(r.date)}`;
  const lead = dateLeadSentence(all, i, MARKET);

  const neighbours = [newer, older].filter(Boolean);

  return renderInto(shell, {
    title: brandTitle(
      `UK Insider Index, ${dateLabel(r.date)}: ${r.score}, ${r.tier.phrase}`,
    ),
    description: lead,
    canonical,
    breadcrumbs: [
      { name: "Insider Index", item: `https://${HOST}${indexPath()}` },
      { name: dateLabel(r.date), item: canonical },
    ],
    body: page(`<p style="${EYEBROW}">Insider Index</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">The UK Insider Index on ${esc(dateLabel(r.date))}</h1>
  <p style="font-size:44px;font-weight:600;line-height:1;margin:16px 0 4px">${esc(r.score)}<span style="font-size:14px;font-weight:400;color:#6b6154"> / 100 · ${esc(r.tier.label)}</span></p>
  <p style="font-size:16px;line-height:1.6;color:#4a4034;max-width:62ch">${esc(readingSentence(all, i, MARKET))} ${esc(windowSentence(r, MARKET))}</p>
  <p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(trackingNotice(MARKET))} The index is buying against its own record, not net of selling: the record holds purchases only.</p>
  ${caveats(complete, gap)}
  ${
    neighbours.length
      ? `<h2 style="font-size:15px;margin:32px 0 10px">Days either side</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>${readingRows(neighbours)}</tbody></table>`
      : ""
  }
  <h2 style="font-size:15px;margin:32px 0 10px">How it is calculated</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${methodologyHtml()}</ul>
  <p style="margin-top:24px;font-size:14px"><a href="https://${HOST}${esc(indexPath())}">Today’s reading</a> · <a href="https://${HOST}/weekly">Week by week</a> · <a href="https://${HOST}/cluster-buys">Cluster buying</a></p>`),
  });
}
