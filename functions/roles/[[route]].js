// Crawler pre-render for the role hubs — /roles and /roles/:slug.
//
// A catch-all rather than two Functions, for the same reason biggest-buys uses
// one: the index and a bucket page read the same fetch and differ only in what
// they group it by, so splitting them would duplicate the fetch and the
// truncation posture to vary a filter.
//
// The classifier and the methodology come from shared/roles.js. Read that
// file's header before changing anything here — three specific things make a
// naive job-title match wrong, and two of them would state something false
// about a named person.

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import { summarise } from "../../shared/boards.js";
import { buyPerson, buyValue, isEligibleBuy } from "../../shared/leaderboard.js";
import {
  inRole,
  missingRoleLabel,
  roleBySlug,
  roleCoverage,
  rolePath,
  rolesForMarket,
  METHODOLOGY,
  MIN_FILINGS,
  TOP_FILINGS,
} from "../../shared/roles.js";
import { esc, noindex, page, renderInto } from "../../shared/prerender.js";
import { windowStart } from "../../shared/sectors.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";
import { trackingNotice } from "../../shared/tracking.js";

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

const signedPp = (r) =>
  r == null ? "n/a" : `${r > 0 ? "+" : ""}${(r * 100).toFixed(1)}pp`;

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

const cleanInsider = (n) => {
  const out = String(n ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

  return out || String(n ?? "").trim();
};

const alphaOf = (d) => {
  const lp = d?.live_performance;
  const pct = lp?.alpha_pct_disclosed ?? lp?.alpha_pct_trade;

  return pct == null || !isFinite(Number(pct)) ? null : Number(pct) / 100;
};

function filingsInRole(dealings, market, slug) {
  return (dealings ?? [])
    .filter((d) => isEligibleBuy(d, market) && inRole(d, market, slug))
    .sort((a, b) => buyValue(b) - buyValue(a));
}

const EYEBROW =
  "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";
const CELL = "padding:8px 12px;border-bottom:1px solid #ece1cf";
const QUIET = "display:block;font-size:12px;color:#6b6154;margin-top:2px";

const methodList = () =>
  METHODOLOGY.map(
    (line) => `<li style="margin-bottom:8px">${esc(line)}</li>`,
  ).join("");

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

function indexPrerender(buckets, coverage, market, host, complete) {
  const symbol = SYMBOL[market];

  const cards = buckets
    .map(
      ({ role, filings, summary }) => `<li style="margin-bottom:14px">
      <a href="https://${esc(host)}${rolePath(role.slug)}"><strong>${esc(role.plural)}</strong></a>
      — ${esc(filings.length)} purchases, ${esc(money(summary.value, symbol))} across ${esc(summary.companies)} ${summary.companies === 1 ? "company" : "companies"}
      <span style="${QUIET}">${esc(role.blurb)}</span>
    </li>`,
    )
    .join("");

  return page(`<p style="${EYEBROW}">By role</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(market)} insider buying by role</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">The same twelve months of ${esc(market)} buying, split by the job the buyer filed under. A chief executive and a newly appointed non-executive are both insiders, and they are not both saying the same thing when they buy.</p>
  <p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(trackingNotice(market))}</p>
  ${complete ? "" : `<p style="font-size:13px;color:#6b6154">We couldn’t load the whole period, so these counts may be missing older purchases.</p>`}
  <ul style="font-size:15px;line-height:1.6;color:#4a4034;max-width:70ch">${cards}</ul>
  <p style="font-size:13px;color:#6b6154;max-width:64ch">These groups overlap and are not meant to add up. A non-executive chair is counted under both Chair and Non-executive director. Of the ${esc(coverage.total)} disclosures in the window, ${esc(coverage.classified)} fall into at least one group, ${esc(coverage.unbucketed)} carry a job title we don’t publish a page for, and ${esc(coverage.closelyAssociated)} were filed by someone closely associated with an insider rather than by the insider${coverage.missing > 0 ? `, and ${esc(coverage.missing)} were ${esc(missingRoleLabel(market))}` : ""}.</p>
  <h2 style="font-size:15px;margin:32px 0 10px">How roles are matched</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${methodList()}</ul>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/biggest-buys">The biggest buys</a> · <a href="https://${esc(host)}/cluster-buys">Cluster buying</a> · <a href="https://${esc(host)}/sectors">Buying by sector</a> · <a href="https://${esc(host)}/learn">Glossary</a></p>`);
}

// ---------------------------------------------------------------------------
// One role
// ---------------------------------------------------------------------------

function rolePrerender(role, filings, market, host, complete, siblings) {
  const symbol = SYMBOL[market];
  const shown = filings.slice(0, TOP_FILINGS);
  const summary = summarise(filings);

  const body = shown
    .map((d, i) => {
      const filed = d?.director?.role ?? d?.reporter?.officer_title ?? "";

      return `<tr>
      <td style="${CELL}">${i + 1}</td>
      <td style="${CELL}"><a href="https://${esc(host)}/company/${esc(displayTicker(d.ticker).toLowerCase())}">${esc(cleanCompany(d.company) || displayTicker(d.ticker))}</a></td>
      <td style="${CELL}">${esc(cleanInsider(buyPerson(d)) || "—")}${
        filed ? `<span style="${QUIET}">${esc(filed)}</span>` : ""
      }</td>
      <td style="${CELL}">${esc(d.trade_date ?? "")}</td>
      <td style="${CELL}">${esc(money(buyValue(d), symbol))}</td>
      <td style="${CELL}">${esc(signedPp(alphaOf(d)))}</td>
    </tr>`;
    })
    .join("");

  const others = siblings
    .map(
      (r) =>
        `<a href="https://${esc(host)}${rolePath(r.slug)}">${esc(r.plural)}</a>`,
    )
    .join(" · ");

  return page(`<p style="${EYEBROW}">By role</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(role.plural)} buying their own shares (${esc(market)})</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(role.blurb)}</p>
  <p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(trackingNotice(market))}</p>
  ${complete ? "" : `<p style="font-size:13px;color:#6b6154">We couldn’t load the whole period, so this may be missing older purchases.</p>`}
  <p style="font-size:14px;color:#4a4034;max-width:62ch">Covers the ${esc(filings.length)} qualifying purchases by ${esc(role.noun)} in the last twelve months, worth ${esc(money(summary.value, symbol))} across ${esc(summary.companies)} ${summary.companies === 1 ? "company" : "companies"}; the ${shown.length} largest are listed. Median alpha since disclosure: ${esc(signedPp(summary.medianAlpha))}, taken from the ${esc(summary.alphaCount)} with a performance mark.</p>
  <p style="font-size:14px;line-height:1.6;color:#4a4034;max-width:66ch">${esc(role.definition)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">#</th>
    <th style="text-align:left;padding:8px 12px">Company</th>
    <th style="text-align:left;padding:8px 12px">Bought by</th>
    <th style="text-align:left;padding:8px 12px">Date</th>
    <th style="text-align:left;padding:8px 12px">Value bought</th>
    <th style="text-align:left;padding:8px 12px">Alpha since disclosure</th>
  </tr></thead><tbody>${body}</tbody></table>
  <h2 style="font-size:15px;margin:32px 0 10px">How this group is matched</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${methodList()}</ul>
  ${others ? `<h2 style="font-size:15px;margin:32px 0 10px">Other roles</h2><p style="font-size:14px">${others}</p>` : ""}
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/roles">All roles</a> · <a href="https://${esc(host)}/learn/pdmr">PDMR</a> · <a href="https://${esc(host)}/learn/open-market-buy">Open-market buys</a></p>`);
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
  const role = slug ? roleBySlug(slug) : null;

  // A bucket that exists but isn't published on this market — /roles/chair on
  // ddbx.us. Not an error and not a page: the office genuinely has no Form 4
  // equivalent, and an empty board would imply no chairs buy.
  if (slug && (!role || !role.markets.includes(market))) return noindex(shell);

  let dealings;
  let complete;

  try {
    ({ dealings, complete } = await fetchDealingsWindow({
      apiBase: API_BASE,
      market,
      since: windowStart(new Date()),
      until: null,
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 1800, "400-499": 60, "500-599": 0 },
      },
    }));
  } catch {
    return shell;
  }

  if (role) {
    const filings = filingsInRole(dealings, market, role.slug);

    // Below the bar is a stub; a failed fetch produces the same empty list, and
    // `complete` is the only thing that tells them apart.
    if (filings.length < MIN_FILINGS) return complete ? noindex(shell) : shell;

    const canonical = `https://${host}${rolePath(role.slug)}`;
    const siblings = rolesForMarket(market).filter(
      (r) => r.slug !== role.slug,
    );

    return renderInto(shell, {
      title: brandTitle(`${role.plural} buying their own shares (${market})`),
      description: `What ${market} ${role.noun} have been buying in their own companies over the last twelve months: ${filings.length} qualifying purchases, which companies, how much, and how they have performed against the market.`,
      canonical,
      breadcrumbs: [
        { name: "By role", item: `https://${host}/roles` },
        { name: role.label, item: canonical },
      ],
      body: rolePrerender(role, filings, market, host, complete, siblings),
    });
  }

  const buckets = rolesForMarket(market)
    .map((r) => {
      const filings = filingsInRole(dealings, market, r.slug);

      return { role: r, filings, summary: summarise(filings) };
    })
    .filter((b) => b.filings.length >= MIN_FILINGS);

  if (buckets.length === 0) return complete ? noindex(shell) : shell;

  const canonical = `https://${host}/roles`;

  return renderInto(shell, {
    title: brandTitle(`${market} insider buying by role`),
    description: `${market} insider buying split by the job the buyer filed under — chief executives, finance directors and the rest of the board, and how each group's purchases have performed against the market.`,
    canonical,
    breadcrumbs: [{ name: "By role", item: canonical }],
    body: indexPrerender(
      buckets,
      roleCoverage(dealings, market),
      market,
      host,
      complete,
    ),
  });
}
