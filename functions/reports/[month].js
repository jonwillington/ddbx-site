// Crawler pre-render for a monthly report: /reports/june-2026.
//
// These are the pages most likely to be linked to rather than merely read, so
// the pre-render carries the substance a citation would quote: the headline,
// the written intro and macro note, the month's totals, the sector table, and
// the report card grading the previous month's featured picks — hits and
// misses both.
//
// The slug parser comes from shared/months.js, the same module the SPA route
// uses. If the two disagreed about what "june-2026" means, a crawler would get
// an empty shell for a URL that renders fine in a browser.

import {
  esc,
  fetchJson,
  noindex,
  page,
  renderInto,
} from "../../shared/prerender.js";
import { monthLabel, reportPath, slugToMonth } from "../../shared/months.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";

// Reports are per-market and the market comes from the domain, exactly as it
// does for company pages. ddbx.eu has no reports yet, so it falls through to
// the noindex path when the API returns nothing.
const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

const money = (v) => {
  const n = Number(v);

  if (!isFinite(n) || n === 0) return "—";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;

    return `£${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}m`;
  }

  return `£${Math.round(n / 1000)}k`;
};

const pct = (v) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

const paras = (text) =>
  String(text ?? "")
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map(
      (p) =>
        `<p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(p)}</p>`,
    )
    .join("");

/** Lead sentence, also the meta description. Templated from the month's real
 *  numbers rather than model-written — the prose above it is already
 *  LLM-authored and stored; regenerating a summary of a summary would add API
 *  spend and a second thing to keep in step. */
function leadSentence(summary, marketLabel) {
  const m = summary.metrics;

  return `${marketLabel} insiders bought ${money(m.total_value_gbp)} of their own shares across ${m.total_buys} disclosed purchases in ${monthLabel(summary.month)}, spanning ${m.distinct_companies} companies and ${m.distinct_directors} individuals.`;
}

function prerender(summary, marketLabel, host) {
  const m = summary.metrics;

  const sectorRows = (m.sector_table ?? [])
    .slice()
    .sort((a, b) => b.total_value_gbp - a.total_value_gbp)
    .map(
      (s) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(s.sector)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${s.buy_count}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(money(s.total_value_gbp))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(pct(s.median_alpha))}</td>
    </tr>`,
    )
    .join("");

  const card = summary.report_card;
  const cardRows = (card?.items ?? [])
    .map(
      (i) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(i.ticker)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(i.company)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(pct(i.return_now))}</td>
    </tr>`,
    )
    .join("");

  const featured = (summary.featured ?? [])
    .map(
      (f) =>
        `<li style="margin-bottom:6px"><strong>${esc(f.ticker)}</strong> — ${esc(f.company)}</li>`,
    )
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(monthLabel(summary.month))} ${esc(marketLabel)} insider buying report</h1>
  <p style="font-size:19px;font-weight:600;line-height:1.3;margin:0 0 16px">${esc(summary.headline)}</p>
  ${paras(summary.intro)}
  <p style="font-size:14px;color:#6b6154">${esc(m.total_buys)} buys · ${esc(money(m.total_value_gbp))} · ${esc(m.distinct_companies)} companies · ${esc(m.distinct_directors)} insiders · ${esc(m.cluster_count)} clusters</p>
  ${summary.macro_note ? `<h2 style="font-size:15px;margin:32px 0 10px">Market backdrop</h2>${paras(summary.macro_note)}` : ""}
  ${
    cardRows
      ? `<h2 style="font-size:15px;margin:32px 0 10px">How ${esc(monthLabel(card.graded_month))}’s picks did</h2>
  <p style="font-size:14px;line-height:1.6;color:#5a4d3a">${card.hits} of ${card.hits + card.misses} featured buys were up as of ${esc(card.as_of)}.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>${cardRows}</tbody></table>`
      : ""
  }
  ${
    sectorRows
      ? `<h2 style="font-size:15px;margin:32px 0 10px">By sector</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Sector</th>
    <th style="text-align:left;padding:8px 12px">Buys</th>
    <th style="text-align:left;padding:8px 12px">Value</th>
    <th style="text-align:left;padding:8px 12px">Median alpha</th>
  </tr></thead><tbody>${sectorRows}</tbody></table>`
      : ""
  }
  ${featured ? `<h2 style="font-size:15px;margin:32px 0 10px">Featured buys</h2><ul style="font-size:14px;line-height:1.7">${featured}</ul>` : ""}
  <p style="margin-top:24px;font-size:13px;color:#6b6154">Past performance is not a reliable indicator of future results. Returns are marked against the latest cached close, not live prices.</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/reports">Every report</a> · <a href="https://${esc(host)}/companies">Browse companies</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const month = slugToMonth(decodeURIComponent(String(params.month ?? "")));

  const shell = await context.next();

  // This route is on the middleware's skip list (two head passes would emit
  // two rel=canonical tags), so the preview-host noindex is applied here.
  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (!month) return noindex(shell);

  const market = MARKET_BY_HOST[host];

  if (!market) return noindex(shell);

  const marketParam = market === "US" ? "&market=US" : "";
  const data = await fetchJson(
    `${API_BASE}/monthly-summary?month=${encodeURIComponent(month)}${marketParam}`,
  );

  // No report for that month yet — a real and expected 404, not an error.
  if (!data?.summary) return noindex(shell);

  const canonical = `https://${host}${reportPath(month)}`;
  const title = brandTitle(
    `${monthLabel(month)} ${market === "US" ? "insider" : "director"} buying report (${market})`,
  );
  const description = leadSentence(data.summary, market);

  return renderInto(shell, {
    title,
    description,
    canonical,
    breadcrumbs: [
      { name: "Reports", item: `https://${host}/reports` },
      { name: monthLabel(month), item: canonical },
    ],
    body: prerender(data.summary, market, host),
  });
}
