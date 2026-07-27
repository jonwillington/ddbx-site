// Crawler pre-render for the broker head-to-heads: /brokers/compare/x-vs-y.
//
// Mirrors functions/brokers/best-for/[category].js. The pair list, the intro
// and the verdict come from shared/broker-comparisons.js — the same module
// src/pages/broker-comparison.tsx reads — so the crawler and the hydrated page
// render the same verdict rather than two drafts of it.
//
// The verdict is the whole reason these pages are allowed to exist (19 brokers
// is 171 possible pairs; we publish six), so it is the one thing that must
// appear in the pre-render. A crawler seeing only the fee table would see
// exactly the templated comparison the curation was meant to avoid.

import {
  brokersForComparison,
  comparisonBySlug,
  comparisonPath,
  feeCrossover,
} from "../../../shared/broker-comparisons.js";
import {
  esc,
  fetchJson,
  noindex,
  page,
  renderInto,
} from "../../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
const CANONICAL_HOST = "ddbx.uk";

const fmtMoney = (v) =>
  v == null ? "—" : v === 0 ? "Free" : `£${Number(v).toLocaleString("en-GB")}`;

const fmtPct = (v) => (v == null ? "—" : v === 0 ? "Free" : `${Number(v.toFixed(2))}%`);

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

/** Same "only what differs" rule as the React page — a table whose rows mostly
 *  match teaches the reader there's nothing to compare. */
const ROWS = [
  { label: "Platform fee", get: (b) => platformFee(b.fees) },
  { label: "UK dealing", get: (b) => fmtMoney(b.fees?.trade_commission_uk_gbp) },
  { label: "US dealing", get: (b) => fmtMoney(b.fees?.trade_commission_us_gbp) },
  { label: "FX fee", get: (b) => fmtPct(b.fees?.fx_fee_pct) },
  { label: "Stocks & Shares ISA", get: (b) => yesNo(b.accounts?.stocks_isa) },
  { label: "SIPP", get: (b) => yesNo(b.accounts?.sipp) },
  { label: "Lifetime ISA", get: (b) => yesNo(b.accounts?.lisa) },
  { label: "Junior ISA", get: (b) => yesNo(b.accounts?.jisa) },
  { label: "US shares", get: (b) => yesNo(b.assets?.us_shares) },
  { label: "Funds", get: (b) => yesNo(b.assets?.mutual_funds) },
  { label: "Investment trusts", get: (b) => yesNo(b.assets?.investment_trusts) },
  { label: "Fractional shares", get: (b) => yesNo(b.assets?.fractional_shares) },
];

function yesNo(v) {
  return v === true ? "Yes" : v === false ? "No" : "—";
}

function prerender(comparison, a, b) {
  const differing = ROWS.filter((r) => r.get(a) !== r.get(b));
  const rows = differing
    .map(
      (r) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(r.label)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(r.get(a))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(r.get(b))}</td>
    </tr>`,
    )
    .join("");

  const crossover = feeCrossover(a, b);
  const crossoverBlock = crossover
    ? `<p style="font-size:15px;line-height:1.6;color:#1E1506;max-width:60ch"><strong>${esc(crossover.cheaperAbove.name)} becomes the cheaper platform at about £${crossover.pot.toLocaleString("en-GB")}.</strong> Below that balance ${esc(crossover.cheaperBelow.name)}’s percentage charge costs less; above it, ${esc(crossover.cheaperAbove.name)}’s flat monthly fee does.</p>`
    : "";

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(comparison.title)}</h1>
  <p style="font-size:13px;color:#6b6154;margin:0 0 16px"><strong>Ad</strong> — we may earn a commission if you open an account through links on this page. It doesn’t affect what you pay, or how we rank platforms.</p>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(comparison.intro)}</p>
  ${crossoverBlock}
  ${
    rows
      ? `<h2 style="font-size:15px;margin:32px 0 10px">Where they differ</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px"></th>
    <th style="text-align:left;padding:8px 12px">${esc(a.name)}</th>
    <th style="text-align:left;padding:8px 12px">${esc(b.name)}</th>
  </tr></thead><tbody>${rows}</tbody></table>`
      : ""
  }
  <h2 style="font-size:15px;margin:32px 0 10px">Which should you pick</h2>
  <p style="font-size:15px;line-height:1.65;color:#4a4034;max-width:62ch">${esc(comparison.verdict)}</p>
  <p style="margin-top:32px;font-size:14px"><a href="https://${CANONICAL_HOST}/brokers/${esc(a.slug)}">${esc(a.name)} review</a> · <a href="https://${CANONICAL_HOST}/brokers/${esc(b.slug)}">${esc(b.name)} review</a> · <a href="https://${CANONICAL_HOST}/brokers">Compare every UK platform</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const slug = decodeURIComponent(String(params.pair ?? ""));
  const comparison = comparisonBySlug(slug);

  const shell = await context.next();

  // See the note in functions/brokers/best-for/[category].js — this route is
  // on the middleware's skip list, so the preview-host noindex has to be
  // applied here rather than inherited.
  if (!isProductionHost(new URL(request.url).hostname)) return noindex(shell);

  if (!comparison) return noindex(shell);

  const data = await fetchJson(`${API_BASE}/brokers?market=UK`, 3600);
  const pair = brokersForComparison(comparison, data?.brokers ?? []);

  // One side missing means a verdict about a platform whose figures aren't on
  // the page — worse than no page.
  if (!pair) return noindex(shell);

  const canonical = `https://${CANONICAL_HOST}${comparisonPath(comparison.slug)}`;
  const title = brandTitle(`${comparison.title} — which should you pick?`);

  return renderInto(shell, {
    title,
    description: comparison.description,
    canonical,
    breadcrumbs: [
      { name: "UK platforms", item: `https://${CANONICAL_HOST}/brokers` },
      { name: comparison.title, item: canonical },
    ],
    body: prerender(comparison, pair.a, pair.b),
  });
}
