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

/** ISO date or datetime → "1 July 2026". Falls back to the raw value, which is
 *  still a date a reader can parse. Same formatting the page uses. */
const dateLabel = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return String(iso);

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

/** "PANR.L" → "panr", matching companyPath in src/lib/company.ts. */
const tickerToSlug = (ticker) =>
  String(ticker ?? "")
    .replace(/\.L$/i, "")
    .toLowerCase();

const STYLE_LABEL = {
  contrarian: "Contrarian",
  momentum: "Momentum",
  neutral: "Neutral",
};

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
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(pct(s.median_return))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(pct(s.median_alpha))}</td>
    </tr>`,
    )
    .join("");

  // The buy-style split is stored on every summary and, until the page started
  // rendering it, was shown nowhere at all.
  const styleRows = (m.style_split ?? [])
    .slice()
    .sort((a, b) => b.total_value_gbp - a.total_value_gbp)
    .map(
      (s) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(STYLE_LABEL[s.style] ?? s.style)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${s.buy_count}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(money(s.total_value_gbp))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(pct(s.median_return))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(pct(s.median_alpha))}</td>
    </tr>`,
    )
    .join("");

  const card = summary.report_card;
  // Both marks per row, as the page states them: what the pick was worth when
  // it was published, and what it is worth now.
  const cardRows = (card?.items ?? [])
    .map(
      (i) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(i.ticker)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(i.company)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(pct(i.return_at_publication))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(pct(i.return_now))}</td>
    </tr>`,
    )
    .join("");

  const featured = (summary.featured ?? [])
    .map(
      (f) =>
        `<li style="margin-bottom:6px"><strong>${esc(f.ticker)}</strong> — ${esc(f.company)}${
          f.director_name ? ` · ${esc(f.director_name)}` : ""
        }${f.disclosed_date ? ` · disclosed ${esc(f.disclosed_date)}` : ""}</li>`,
    )
    .join("");

  // Every cluster is a company we publish a page for, so the roster is also
  // the densest set of internal links this document has.
  const clusters = (summary.clusters ?? [])
    .slice()
    .sort((a, b) => b.insider_count - a.insider_count)
    .map(
      (c) =>
        `<li style="margin-bottom:6px"><a href="/company/${esc(tickerToSlug(c.ticker))}">${esc(c.company)}</a> (${esc(c.ticker)}) — ${c.insider_count} insiders</li>`,
    )
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(monthLabel(summary.month))} ${esc(marketLabel)} insider buying report</h1>
  <p style="font-size:19px;font-weight:600;line-height:1.3;margin:0 0 8px">${esc(summary.headline)}</p>
  <p style="font-size:13px;color:#6b6154;margin:0 0 16px">${summary.created_at ? `Published ${esc(dateLabel(summary.created_at))} · ` : ""}Drafted with AI assistance from disclosed filings. Not investment advice.</p>
  ${paras(summary.intro)}
  <p style="font-size:14px;color:#6b6154">${esc(m.total_buys)} buys · ${esc(money(m.total_value_gbp))} · ${esc(m.distinct_companies)} companies · ${esc(m.distinct_directors)} insiders · ${esc(m.cluster_count)} clusters</p>
  ${summary.macro_note ? `<h2 style="font-size:15px;margin:32px 0 10px">Market backdrop</h2>${paras(summary.macro_note)}` : ""}
  ${
    cardRows
      ? `<h2 style="font-size:15px;margin:32px 0 10px">How ${esc(monthLabel(card.graded_month))}’s picks did</h2>
  <p style="font-size:14px;line-height:1.6;color:#5a4d3a">${card.hits} of ${card.hits + card.misses} featured buys were up as of ${esc(dateLabel(card.as_of))}. ${card.hits} ${card.hits === 1 ? "hit" : "hits"}, ${card.misses} ${card.misses === 1 ? "miss" : "misses"}.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Ticker</th>
    <th style="text-align:left;padding:8px 12px">Company</th>
    <th style="text-align:left;padding:8px 12px">At publication</th>
    <th style="text-align:left;padding:8px 12px">Now</th>
  </tr></thead><tbody>${cardRows}</tbody></table>`
      : ""
  }
  ${
    sectorRows
      ? `<h2 style="font-size:15px;margin:32px 0 10px">By sector</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Sector</th>
    <th style="text-align:left;padding:8px 12px">Buys</th>
    <th style="text-align:left;padding:8px 12px">Value</th>
    <th style="text-align:left;padding:8px 12px">Median return</th>
    <th style="text-align:left;padding:8px 12px">Median alpha</th>
  </tr></thead><tbody>${sectorRows}</tbody></table>`
      : ""
  }
  ${
    styleRows
      ? `<h2 style="font-size:15px;margin:32px 0 10px">By buy style</h2>
  <p style="font-size:14px;line-height:1.6;color:#5a4d3a">Contrarian buys land after a fall, momentum buys after a rise.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Style</th>
    <th style="text-align:left;padding:8px 12px">Buys</th>
    <th style="text-align:left;padding:8px 12px">Value</th>
    <th style="text-align:left;padding:8px 12px">Median return</th>
    <th style="text-align:left;padding:8px 12px">Median alpha</th>
  </tr></thead><tbody>${styleRows}</tbody></table>`
      : ""
  }
  ${featured ? `<h2 style="font-size:15px;margin:32px 0 10px">Featured buys</h2><ul style="font-size:14px;line-height:1.7">${featured}</ul>` : ""}
  ${
    clusters
      ? `<h2 style="font-size:15px;margin:32px 0 10px">Clusters</h2>
  <p style="font-size:14px;line-height:1.6;color:#5a4d3a">${(summary.clusters ?? []).length} ${(summary.clusters ?? []).length === 1 ? "company" : "companies"} had two or more insiders buying in the same month.</p>
  <ul style="font-size:14px;line-height:1.7">${clusters}</ul>`
      : ""
  }
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
