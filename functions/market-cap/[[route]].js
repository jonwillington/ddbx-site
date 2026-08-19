// Crawler pre-render for the market-cap band hubs.
//
// A catch-all rather than two Functions, for the reason biggest-buys and roles
// use one: the index and a band page read the same call and differ only in what
// they group it by.
//
// The bands, the thresholds and the methodology come from shared/cap-bands.js,
// the same module the React page uses. Read that file's header before touching
// the currency handling — "GBp" describes the price quote, not the cap, and
// treating it as pence divides every UK company by 100.

import {
  bandBySlug,
  bandMeetsBar,
  bandPath,
  bandRollup,
  exclusionSentence,
  thresholdSentence,
  METHODOLOGY,
  MIN_COMPANIES,
  TOP_COMPANIES,
} from "../../shared/cap-bands.js";
import { esc, fetchJson, noindex, page, renderInto } from "../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";
import { TRACKING_NOTICE } from "../../shared/tracking.js";

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

const displayTicker = (t) => String(t ?? "").replace(/\.L$/i, "");

const cleanCompany = (c) => {
  let out = String(c ?? "").trim();

  for (;;) {
    const next = out
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
      .trim();

    if (next === out || next === "") return out;
    out = next;
  }
};

const EYEBROW =
  "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";
const CELL = "padding:8px 12px;border-bottom:1px solid #ece1cf";

const methodList = () =>
  METHODOLOGY.map(
    (line) => `<li style="margin-bottom:8px">${esc(line)}</li>`,
  ).join("");

function indexPrerender(rollup, market, host) {
  const symbol = SYMBOL[market];
  const shown = rollup.bands.filter(bandMeetsBar);
  const exclusions = exclusionSentence(rollup, market);

  const cards = shown
    .map(
      (row) => `<li style="margin-bottom:14px">
      <a href="https://${esc(host)}${esc(bandPath(row.band.slug))}"><strong>${esc(row.band.plural)}</strong></a>
      — ${esc(row.count)} companies, ${esc(row.deals)} purchases, ${esc(money(row.value, symbol))}
      <span style="display:block;font-size:12px;color:#6b6154;margin-top:2px">${esc(thresholdSentence(row.band, market))} ${esc(row.band.blurb)}</span>
    </li>`,
    )
    .join("");

  return page(`<p style="${EYEBROW}">By size</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(market)} insider buying by company size</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">The same disclosed buying, split by how big the company is. A chief executive putting ${esc(symbol)}100,000 into a ${esc(symbol)}20bn company and into a ${esc(symbol)}50m one are not the same act, and the size of the business is most of the difference.</p>
  <p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(TRACKING_NOTICE)}</p>
  <ul style="font-size:15px;line-height:1.6;color:#4a4034;max-width:70ch">${cards}</ul>
  ${exclusions ? `<p style="font-size:13px;color:#6b6154;max-width:64ch">${esc(exclusions)}</p>` : ""}
  <h2 style="font-size:15px;margin:32px 0 10px">How the bands are drawn</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${methodList()}</ul>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/sectors">Buying by sector</a> · <a href="https://${esc(host)}/roles">Buying by role</a> · <a href="https://${esc(host)}/most-active-companies">Most-active companies</a> · <a href="https://${esc(host)}/companies">Browse companies</a></p>`);
}

function bandPrerender(row, rollup, market, host, siblings) {
  const symbol = SYMBOL[market];
  const listed = row.companies.slice(0, TOP_COMPANIES);

  const body = listed
    .map(
      (c, i) => `<tr>
      <td style="${CELL}">${i + 1}</td>
      <td style="${CELL}"><a href="https://${esc(host)}/company/${esc(displayTicker(c.key).toLowerCase())}">${esc(cleanCompany(c.company) || displayTicker(c.key))}</a></td>
      <td style="${CELL}">${esc(c.deals)}</td>
      <td style="${CELL}">${esc(c.market_cap ? money(c.market_cap, symbol) : "—")}</td>
      <td style="${CELL}">${esc(c.sector_normalized ?? "—")}</td>
      <td style="${CELL}">${esc(money(c.total_value ?? 0, symbol))}</td>
    </tr>`,
    )
    .join("");

  const others = siblings
    .map(
      (b) =>
        `<a href="https://${esc(host)}${esc(bandPath(b.slug))}">${esc(b.plural)}</a>`,
    )
    .join(" · ");

  const held =
    row.count > listed.length
      ? `${row.count - listed.length} further ${row.count - listed.length === 1 ? "company" : "companies"} in this band had disclosed buying below the ${listed.length} listed here.`
      : "";

  return page(`<p style="${EYEBROW}">By size</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(row.band.plural)} where ${esc(market)} insiders are buying</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(row.band.blurb)}</p>
  <p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(TRACKING_NOTICE)}</p>
  <p style="font-size:14px;color:#4a4034;max-width:62ch">${esc(thresholdSentence(row.band, market))} ${esc(row.count)} of them have disclosed insider buying, across ${esc(row.deals)} purchases worth ${esc(money(row.value, symbol))}; the ${listed.length} with the most bought are listed.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">#</th>
    <th style="text-align:left;padding:8px 12px">Company</th>
    <th style="text-align:left;padding:8px 12px">Purchases</th>
    <th style="text-align:left;padding:8px 12px">Market value</th>
    <th style="text-align:left;padding:8px 12px">Sector</th>
    <th style="text-align:left;padding:8px 12px">Value bought</th>
  </tr></thead><tbody>${body}</tbody></table>
  ${held ? `<p style="font-size:13px;color:#6b6154;max-width:64ch">${esc(held)}</p>` : ""}
  <h2 style="font-size:15px;margin:32px 0 10px">How the bands are drawn</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${methodList()}</ul>
  ${others ? `<h2 style="font-size:15px;margin:32px 0 10px">Other bands</h2><p style="font-size:14px">${others}</p>` : ""}
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/market-cap">All size bands</a> · <a href="https://${esc(host)}/sectors">Buying by sector</a> · <a href="https://${esc(host)}/companies">Browse companies</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);

  const rest = params.route;
  const segments = Array.isArray(rest) ? rest : rest ? [rest] : [];

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (segments.length > 1) return noindex(shell);

  const market = MARKET_BY_HOST[host];

  if (!market) return noindex(shell);

  const slug = segments[0] ? decodeURIComponent(segments[0]) : null;
  const band = slug ? bandBySlug(slug) : null;

  if (slug && !band) return noindex(shell);

  // fetchJson's second argument is the success TTL in seconds; it applies its
  // own cacheTtlByStatus so a blip can't be pinned for the full half hour.
  const data = await fetchJson(`${API_BASE}/companies?market=${market}`, 1800);

  // A pre-render failing should cost the injected content, not the URL.
  if (!data) return shell;

  const rollup = bandRollup(data.companies ?? [], market);

  if (band) {
    const row = rollup.bands.find((b) => b.band.slug === band.slug);

    // Below the bar is a stub. Unlike the boards there is no `complete` flag to
    // tell an empty band from a failed fetch — but `data` being non-null means
    // the index loaded, so an empty band here really is empty.
    if (!row || !bandMeetsBar(row)) return noindex(shell);

    const canonical = `https://${host}${bandPath(band.slug)}`;
    const siblings = rollup.bands
      .filter((b) => b.band.slug !== band.slug && bandMeetsBar(b))
      .map((b) => b.band);

    return renderInto(shell, {
      title: brandTitle(`${band.plural} where ${market} insiders are buying`),
      description: `Which ${band.label.toLowerCase()} ${market} companies insiders have been buying: ${row.count} of them, across ${row.deals} disclosed purchases. ${thresholdSentence(band, market)}`,
      canonical,
      breadcrumbs: [
        { name: "By size", item: `https://${host}/market-cap` },
        { name: band.label, item: canonical },
      ],
      body: bandPrerender(row, rollup, market, host, siblings),
    });
  }

  if (rollup.bands.filter(bandMeetsBar).length === 0) return noindex(shell);

  const canonical = `https://${host}/market-cap`;

  return renderInto(shell, {
    title: brandTitle(`${market} insider buying by company size`),
    description: `${market} insider buying split by company size — large, mid and small-cap — with what was bought in each and the thresholds the split uses.`,
    canonical,
    breadcrumbs: [{ name: "By size", item: canonical }],
    body: indexPrerender(rollup, market, host),
  });
}
