// Crawler pre-render for the sector index: ddbx.uk/sectors, ddbx.us/sectors.
//
// /sectors is on the middleware's skip list — it has to be, because every tag
// that module appends (canonical included) would be appended a second time
// here, and a page with two rel=canonical tags has both ignored. That skip is
// what made this Function necessary rather than optional: without it the route
// was served with no per-page <head> at all AND an empty SPA shell in the body,
// while sitting in the sitemap on both hosts.
//
// The ranking, the publishing bar and the aggregation come from
// shared/sectors.js, the same module the React page uses, so the order a
// crawler reads is the order a reader gets. Mirrors functions/sectors/[slug].js
// throughout — the two pages are one document family and the pair of them
// disagreeing about a sector's total would be worse than either being absent.

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import { esc, noindex, page, renderInto } from "../../shared/prerender.js";
import {
  formatMoney as money,
  formatSignedPct as signedPct,
  indexLeadSentence,
  marketNoun,
  sectorMeetsBar,
  sectorPath,
  sectorRollup,
  windowStart,
  CONCENTRATION_THRESHOLD,
  MARKET_SYMBOL as SYMBOL,
  MIN_BUYS,
} from "../../shared/sectors.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";

const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

const displayTicker = (t) => String(t ?? "").replace(/\.L$/i, "");

function prerender(rows, market, host, complete) {
  const symbol = SYMBOL[market];
  const noun = marketNoun(market);

  const buys = rows.reduce((n, r) => n + r.buys, 0);
  const value = rows.reduce((n, r) => n + r.value, 0);
  const companies = rows.reduce((n, r) => n + r.companies, 0);

  const body = rows
    .map(
      (r) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}${esc(sectorPath(r.sector.slug))}">${esc(r.sector.label)}</a></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${r.buys}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${r.companies}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(money(r.value, symbol))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(signedPct(r.medianAlpha))}</td>
    </tr>`,
    )
    .join("");

  // The concentration caveats, in the same words the row carries on the
  // hydrated page: a sector total can be one company wearing a sector's name,
  // and a crawler reading the total without the caveat reads a wrong fact.
  const caveats = rows
    .filter(
      (r) =>
        r.topCompany &&
        r.topCompanyShare != null &&
        r.topCompanyShare > CONCENTRATION_THRESHOLD,
    )
    .map(
      (r) =>
        `${esc(r.sector.label)}: ${Math.round(r.topCompanyShare * 100)}% of that value is ${esc(displayTicker(r.topCompany))} alone.`,
    )
    .join(" ");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(market)} insider buying by sector</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">Where ${esc(noun)} have been buying their own shares over the last twelve months, and how those buys have performed against the market since they were disclosed.</p>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(indexLeadSentence(rows, market))}</p>
  <p style="font-size:14px;color:#6b6154">${buys} buys · ${esc(money(value, symbol))} · ${companies} companies · ${rows.length} sectors</p>
  ${complete ? "" : `<p style="font-size:13px;color:#6b6154;max-width:62ch">We couldn’t load the whole period, so these totals may be missing older purchases.</p>`}
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Sector</th>
    <th style="text-align:left;padding:8px 12px">Buys</th>
    <th style="text-align:left;padding:8px 12px">Companies</th>
    <th style="text-align:left;padding:8px 12px">Value bought</th>
    <th style="text-align:left;padding:8px 12px">Median alpha</th>
  </tr></thead><tbody>${body}</tbody></table>
  ${caveats ? `<p style="font-size:13px;line-height:1.6;color:#6b6154;max-width:62ch">${caveats}</p>` : ""}
  <p style="margin-top:24px;font-size:13px;color:#6b6154;max-width:62ch">Rolling twelve months of disclosed purchases. Sectors with fewer than ${MIN_BUYS} buys in the window are omitted. Median alpha is the middle buy’s return against the market, measured from the disclosure-day close — the first price a reader could have paid — not from the insider’s own entry, and marked to the latest cached close. Past performance is not a reliable indicator of future results.</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/biggest-buys">Biggest buys</a> · <a href="https://${esc(host)}/companies">Browse companies</a> · <a href="https://${esc(host)}/learn">Glossary</a></p>`);
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);

  const shell = await context.next();

  // On the middleware's skip list, so the preview-host noindex is applied here.
  if (!isProductionHost(url.hostname)) return noindex(shell);

  const market = MARKET_BY_HOST[host];

  // ddbx.eu has no sector hubs.
  if (!market) return noindex(shell);

  const since = windowStart(new Date(request.headers.get("date") || Date.now()));
  const { dealings, complete } = await fetchDealingsWindow({
    apiBase: API_BASE,
    market,
    since,
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 1800, "400-499": 60, "500-599": 0 },
    },
  });

  const rows = sectorRollup(dealings).filter(sectorMeetsBar);

  // Nothing clears the bar: the SPA renders its own empty state and the URL
  // stays legitimate, but an empty ranking isn't a page worth indexing — the
  // same posture the per-sector pre-render takes below MIN_BUYS.
  if (rows.length === 0) return noindex(shell);

  const canonical = `https://${host}/sectors`;
  const title = brandTitle(
    `${market} insider buying by sector (last 12 months)`,
  );

  return renderInto(shell, {
    title,
    description: indexLeadSentence(rows, market),
    canonical,
    breadcrumbs: [{ name: "Sectors", item: canonical }],
    body: prerender(rows, market, host, complete),
  });
}
