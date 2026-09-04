// Crawler pre-render for the broker category pages: /brokers/best-for/isa etc.
//
// Same contract as functions/company/[key].js — the React route at
// src/pages/broker-category.tsx owns the real presentation, and this puts the
// same facts in #root as semantic HTML so a crawler that doesn't run the SPA's
// JS sees the page rather than an empty div.
//
// The editorial content — which brokers, in what order, and the pick line for
// each — comes from shared/broker-categories.js, the same module the React page
// reads. That's the point of it being plain ESM: two renderers, one source, no
// possibility of the pre-render and the hydrated page disagreeing about the
// ranking.
//
// Categories are UK-only (there is no US broker data — /api/brokers?market=US
// 404s), so these pages canonicalise to ddbx.uk whichever domain served them,
// matching canonicalUrlFor() in shared/seo.js.

import {
  brokersForCategory,
  categoryBySlug,
  categoryPath,
  MIN_BROKERS,
  whyWeRank,
} from "../../../shared/broker-categories.js";
import {
  esc,
  fetchJson,
  noindex,
  page,
  renderInto,
} from "../../../shared/prerender.js";
import {
  brandTitle,
  brokerCanonicalHost,
  brokerMarketForHost,
  isProductionHost,
} from "../../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
// Broker routes fold onto ddbx.uk unless the serving host's market publishes
// its own directory, so the canonical host is per-request, not a constant. The
// rule lives in shared/seo.js (BROKER_DIRECTORY_MARKET_IDS) and is shared with
// canonicalUrlFor, the primary nav and the sitemap — a US page that kept the
// old hardcoded ddbx.uk would name a URL that does not exist and ask to be
// dropped from the index.

const fmtMoney = (v) =>
  v == null ? "—" : v === 0 ? "Free" : `£${Number(v).toLocaleString("en-GB")}`;

const fmtPct = (v) => (v == null ? "—" : v === 0 ? "Free" : `${Number(v.toFixed(2))}%`);

/** Mirrors platformFeeSummary() in src/lib/brokers.ts. */
function platformFee(fees) {
  const m = fees?.platform_fee_monthly_gbp;
  const p = fees?.platform_fee_pct;

  if (m === 0 && p === 0) return "Free";
  const parts = [];

  if (m) parts.push(`£${m}/mo`);
  if (p) parts.push(`${p}%`);
  if (parts.length) return parts.join(" + ");
  if (m === 0 && p == null) return "No monthly fee";

  return "—";
}

function prerender(category, brokers, brokerCount, canonicalHost) {
  const entries = brokers
    .map((b, i) => {
      const pick = category.picks[b.slug] ?? b.tagline;

      return `<li style="margin:0 0 18px">
      <h3 style="font-size:16px;margin:0 0 4px"><a href="https://${canonicalHost}/brokers/${esc(b.slug)}">${i + 1}. ${esc(b.name)}</a></h3>
      <p style="font-size:14px;line-height:1.6;color:#5a4d3a;margin:0 0 4px;max-width:58ch">${esc(pick)}</p>
      <p style="font-size:13px;color:#6b6154;margin:0">Platform fee ${esc(platformFee(b.fees))} · UK dealing ${esc(fmtMoney(b.fees?.trade_commission_uk_gbp))} · FX ${esc(fmtPct(b.fees?.fx_fee_pct))}</p>
    </li>`;
    })
    .join("");

  const intro = category.intro
    .map(
      (p) =>
        `<p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(p)}</p>`,
    )
    .join("");

  const lookFor = category.whatToLookFor
    .map((p) => `<li style="margin-bottom:6px">${esc(p)}</li>`)
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(category.h1)}</h1>
  <p style="font-size:13px;color:#6b6154;margin:0 0 16px"><strong>Ad</strong> — we may earn a commission if you open an account through links on this page. It doesn’t affect what you pay, or how we rank platforms.</p>
  ${intro}
  <h2 style="font-size:15px;margin:32px 0 10px">Why we rank platforms</h2>
  ${whyWeRank(brokerCount)
    .map(
      (p) =>
        `<p style="font-size:15px;line-height:1.65;color:#4a4034;max-width:62ch">${esc(p)}</p>`,
    )
    .join("")}
  <h2 style="font-size:15px;margin:32px 0 10px">Our ranking</h2>
  <ol style="list-style:none;padding:0;margin:0">${entries}</ol>
  <h2 style="font-size:15px;margin:32px 0 10px">What to look for</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034">${lookFor}</ul>
  <p style="margin-top:32px;font-size:14px"><a href="https://${canonicalHost}/brokers">Compare every UK platform</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const slug = decodeURIComponent(String(params.category ?? ""));
  const category = categoryBySlug(slug);

  const shell = await context.next();

  // Preview and local hosts get a noindex and nothing else.
  //
  // _middleware.js normally applies that rule, but this route is on its skip
  // list (two passes would emit two rel=canonical tags), so the check has to
  // be repeated here. Without it a *.pages.dev build would serve an indexable
  // page canonicalising to ddbx.uk — the exact competition between preview and
  // production that isProductionHost() exists to prevent.
  const hostname = new URL(request.url).hostname;

  if (!isProductionHost(hostname)) return noindex(shell);

  // Null market = this host publishes no directory of its own, so it is
  // serving the directory of whichever host it canonicalises onto.
  const canonicalHost = brokerCanonicalHost(hostname);
  const market = brokerMarketForHost(hostname) ?? "UK";

  // Unknown category — let the SPA render its own not-found state, but keep
  // the URL out of the index.
  if (!category) return noindex(shell);

  const data = await fetchJson(`${API_BASE}/brokers?market=${market}`, 3600);
  const all = data?.brokers ?? [];
  const ranked = brokersForCategory(category, all);

  // Below the publishing bar (or the API is unreachable): the page would be a
  // list of two, which reads as a stub and ranks like one. Same threshold the
  // sitemap and the React page apply, so a category is never advertised in one
  // place and withheld in another.
  if (ranked.length < MIN_BROKERS) return noindex(shell);

  const canonical = `https://${canonicalHost}${categoryPath(category.slug)}`;
  const title = brandTitle(category.title);

  return renderInto(shell, {
    title,
    description: category.description,
    canonical,
    // "Broker reviews" is the crumb the hydrated page shows (page-shell's
    // `crumbs`, and the review page's own nav), and structured data has to name
    // what the reader sees.
    breadcrumbs: [
      { name: "Broker reviews", item: `https://${canonicalHost}/brokers` },
      { name: category.h1, item: canonical },
    ],
    body: prerender(category, ranked, all.length, canonicalHost),
  });
}
