// Crawler pre-render for a sector hub: /sectors/technology.
//
// The aggregation runs in shared/sectors.js, so the crawler and the hydrated
// page compute the same medians from the same feed rather than two
// implementations that agree until they don't.
//
// Market comes from the domain, as it does for company and report pages: UK
// rows from /api/dealings, US from /api/us-dealings. Both feeds carry
// sector_normalized on every row, so one code path covers both.

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import { esc, noindex, page, renderInto } from "../../shared/prerender.js";
import {
  cleanCompanyName,
  dealValue,
  formatMoney as money,
  formatSignedPct as signedPct,
  leadSentence,
  marketNoun,
  sectorBySlug,
  sectorByLabel,
  sectorMeetsBar,
  sectorPath,
  sectorRollup,
  windowStart,
  CONCENTRATION_THRESHOLD,
  MARKET_SYMBOL as SYMBOL,
  TOP_COMPANIES,
} from "../../shared/sectors.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";
import { trackingNotice } from "../../shared/tracking.js";

const API_BASE = "https://api.ddbx.uk/api";

const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

const displayTicker = (t) => String(t ?? "").replace(/\.L$/i, "");

function prerender(row, deals, market, host, complete) {
  const symbol = SYMBOL[market];

  const byTicker = new Map();

  for (const d of deals) {
    if (!d.ticker) continue;
    const e = byTicker.get(d.ticker) ?? {
      ticker: d.ticker,
      company: d.company ?? d.ticker,
      value: 0,
      buys: 0,
    };

    e.value += dealValue(d);
    e.buys += 1;
    byTicker.set(d.ticker, e);
  }

  const ranked = [...byTicker.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_COMPANIES);

  const companies = ranked
    .map(
      (c) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}/company/${esc(displayTicker(c.ticker).toLowerCase())}">${esc(cleanCompanyName(c.company) || displayTicker(c.ticker))}</a></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(money(c.value, symbol))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${c.buys}</td>
    </tr>`,
    )
    .join("");

  const concentrated =
    row.topCompanyShare != null &&
    row.topCompanyShare > CONCENTRATION_THRESHOLD &&
    row.topCompany;

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(row.sector.label)} — ${esc(market)} insider buying</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(row.sector.framing)}</p>
  <p style="font-size:13px;line-height:1.5;color:#6b6154;max-width:62ch">${esc(trackingNotice(market))}</p>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(leadSentence(row, market))}</p>
  <p style="font-size:14px;color:#6b6154">${row.buys} buys · ${esc(money(row.value, symbol))} · ${row.companies} companies · ${row.people} ${esc(marketNoun(market))} · median alpha ${esc(signedPct(row.medianAlpha))}</p>
  <p style="font-size:13px;color:#6b6154;max-width:62ch">${row.alphaCount} of ${row.buys} buys have a performance mark; the median is taken from those.</p>
  ${
    concentrated
      ? `<p style="font-size:14px;line-height:1.6;color:#6b6154;max-width:62ch">${Math.round(row.topCompanyShare * 100)}% of that value is ${esc(displayTicker(row.topCompany))} alone.</p>`
      : ""
  }
  ${complete ? "" : `<p style="font-size:13px;color:#6b6154;max-width:62ch">We couldn’t load the whole period, so these figures may be missing older purchases.</p>`}
  ${
    companies
      ? `<h2 style="font-size:15px;margin:32px 0 10px">Companies insiders backed</h2>
  <p style="font-size:13px;color:#6b6154;margin:0 0 8px">Top ${ranked.length} by value bought</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Company</th>
    <th style="text-align:left;padding:8px 12px">Value bought</th>
    <th style="text-align:left;padding:8px 12px">Buys</th>
  </tr></thead><tbody>${companies}</tbody></table>`
      : ""
  }
  <p style="margin-top:24px;font-size:13px;color:#6b6154;max-width:62ch">Rolling twelve months of disclosed purchases. Median alpha is the middle buy’s return against the market, measured from the disclosure-day close — the first price a reader could have paid — not from the insider’s own entry, and marked to the latest cached close. Past performance is not a reliable indicator of future results.</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/sectors">Every sector</a> · <a href="https://${esc(host)}/biggest-buys">Biggest buys</a> · <a href="https://${esc(host)}/companies">Browse companies</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const sector = sectorBySlug(decodeURIComponent(String(params.slug ?? "")));

  const shell = await context.next();

  // On the middleware's skip list, so the preview-host noindex is applied here.
  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (!sector) return noindex(shell);

  const market = MARKET_BY_HOST[host];

  if (!market) return noindex(shell);

  const since = windowStart(new Date(request.headers.get("date") || Date.now()));
  // Paged, not one capped request: the API returns at most 1,000 rows per call
  // and the UK window crosses that during 2026. A truncated feed here produces
  // a smaller total and a median drawn from the wrong sample, with nothing to
  // show that anything was missing.
  const { dealings, complete } = await fetchDealingsWindow({
    apiBase: API_BASE,
    market,
    since,
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 1800, "400-499": 60, "500-599": 0 },
    },
  });
  const mine = dealings.filter(
    (d) => sectorByLabel(d.sector_normalized)?.slug === sector.slug,
  );
  const row = sectorRollup(mine)[0] ?? null;

  // Below the activity bar the page is a stub — same threshold the React page
  // and the sitemap apply, so a sector is never advertised in one place and
  // withheld in another.
  if (!sectorMeetsBar(row)) return noindex(shell);

  const canonical = `https://${host}${sectorPath(sector.slug)}`;
  const title = brandTitle(
    `${sector.label} — ${market} insider buying (last 12 months)`,
  );

  return renderInto(shell, {
    title,
    description: leadSentence(row, market),
    canonical,
    breadcrumbs: [
      { name: "Sectors", item: `https://${host}/sectors` },
      { name: sector.label, item: canonical },
    ],
    body: prerender(row, mine, market, host, complete),
  });
}

