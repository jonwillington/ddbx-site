// Crawler pre-render for the weekly archive index: /weekly.
//
// UK on ddbx.uk, US on ddbx.us, from the same code path — the digest exists for
// both markets (WEEKLY_DIGEST_MARKETS in ddbx-data) and the host picks which.

import {
  apexHost,
  esc,
  noindex,
  page,
  renderInto,
} from "../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";
import { archiveLeadSentence, weekLabel, weekPath } from "../../shared/weeks.js";

const API_BASE = "https://api.ddbx.uk/api";
const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  const market = MARKET_BY_HOST[host];

  if (!market) return noindex(shell);

  const res = await fetch(`${API_BASE}/weekly-digests?market=${market}`, {
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 900, "400-499": 60, "500-599": 0 },
    },
  });

  if (!res.ok) return noindex(shell);
  const { weeks } = await res.json();

  // An empty archive is an outage or a cold table, not a page.
  if (!weeks?.length) return noindex(shell);

  const canonical = `https://${host}/weekly`;
  const lead = archiveLeadSentence(weeks, market);
  const rows = weeks
    .map(
      (w) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}${esc(weekPath(w.week_start))}">${esc(weekLabel(w.week_start, w.week_end))}</a></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${w.buy_count} disclosed ${w.buy_count === 1 ? "buy" : "buys"}</td>
    </tr>`,
    )
    .join("");

  return renderInto(shell, {
    title: brandTitle(`${market} insider buying, week by week`),
    description: lead,
    canonical,
    breadcrumbs: [{ name: "Weekly", item: canonical }],
    body: page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(market)} insider buying, week by week</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(lead)}</p>
  <h2 style="font-size:15px;margin:32px 0 10px">Every week</h2>
  <p style="font-size:13px;color:#6b6154;margin:0 0 8px">Newest first. A week with nothing worth reporting doesn’t get an entry.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>${rows}</tbody></table>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/reports">Monthly reports</a> · <a href="https://${esc(host)}/biggest-buys">Biggest buys</a> · <a href="https://${esc(host)}/sectors">By sector</a></p>`),
  });
}
