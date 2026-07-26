// Crawler pre-render for a sector hub: /sectors/technology.
//
// The aggregation runs in shared/sectors.js, so the crawler and the hydrated
// page compute the same medians from the same feed rather than two
// implementations that agree until they don't.
//
// Market comes from the domain, as it does for company and report pages: UK
// rows from /api/dealings, US from /api/us-dealings. Both feeds carry
// sector_normalized on every row, so one code path covers both.

import {
  esc,
  fetchJson,
  noindex,
  page,
  renderInto,
} from "../../shared/prerender.js";
import {
  dealValue,
  sectorBySlug,
  sectorByLabel,
  sectorMeetsBar,
  sectorPath,
  sectorRollup,
  windowStart,
  CONCENTRATION_THRESHOLD,
} from "../../shared/sectors.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";

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

const signedPct = (ratio) =>
  ratio == null ? "n/a" : `${ratio > 0 ? "+" : ""}${(ratio * 100).toFixed(1)}%`;

const displayTicker = (t) => String(t ?? "").replace(/\.L$/i, "");

/** Lead sentence, also the meta description. Templated from the sector's real
 *  figures — the same reasoning as functions/company/[key].js: at this page
 *  count model-written prose would be real API spend, and mass-generated copy
 *  is what gets demoted. */
function leadSentence(row, market) {
  const noun = market === "US" ? "insiders" : "directors";
  const alpha =
    row.medianAlpha == null
      ? ""
      : ` The median buy has returned ${signedPct(row.medianAlpha)} against the market since it was disclosed.`;

  return `${row.buys} disclosed ${noun} purchases across ${row.companies} ${row.sector.label.toLowerCase()} companies in the last twelve months, worth ${money(row.value, SYMBOL[market])}.${alpha}`;
}

function prerender(row, deals, market, host) {
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

  const companies = [...byTicker.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
    .map(
      (c) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}/company/${esc(displayTicker(c.ticker).toLowerCase())}">${esc(c.company)}</a></td>
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
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(leadSentence(row, market))}</p>
  <p style="font-size:14px;color:#6b6154">${row.buys} buys · ${esc(money(row.value, symbol))} · ${row.companies} companies · ${row.people} ${market === "US" ? "insiders" : "directors"} · median alpha ${esc(signedPct(row.medianAlpha))}</p>
  ${
    concentrated
      ? `<p style="font-size:14px;line-height:1.6;color:#6b6154;max-width:62ch">${Math.round(row.topCompanyShare * 100)}% of that value is ${esc(displayTicker(row.topCompany))} alone.</p>`
      : ""
  }
  ${
    companies
      ? `<h2 style="font-size:15px;margin:32px 0 10px">Companies insiders backed</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Company</th>
    <th style="text-align:left;padding:8px 12px">Value bought</th>
    <th style="text-align:left;padding:8px 12px">Buys</th>
  </tr></thead><tbody>${companies}</tbody></table>`
      : ""
  }
  <p style="margin-top:24px;font-size:13px;color:#6b6154;max-width:62ch">Rolling twelve months of disclosed purchases. Median alpha is measured against the market from the disclosure-day close — the first price a reader could have paid — not from the insider's own entry, and is marked to the latest cached close. Past performance is not a reliable indicator of future results.</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/sectors">Every sector</a> · <a href="https://${esc(host)}/companies">Browse companies</a></p>`);
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
  const feed = market === "US" ? "us-dealings" : "dealings";
  const data = await fetchJson(
    `${API_BASE}/${feed}?since=${since}&limit=1000`,
    1800,
  );
  const all = data?.dealings ?? [];
  const mine = all.filter(
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
    body: prerender(row, mine, market, host),
  });
}

