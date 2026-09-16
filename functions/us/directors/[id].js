// Crawler pre-render for a US insider page: /us/directors/0000935596.
//
// The UK twin of this file is functions/directors/[id].js, and the two differ
// in exactly three places, all of them consequences of EDGAR:
//
//   1. NAMES. Form 4 files a natural person surname-first and often shouted —
//      "HOLDING FRANK B JR". A page titled that is a page nobody searching for
//      Frank Holding will match, so every name goes through
//      `usInsiderDisplayName`, which reorders when it can read the name
//      confidently and leaves it exactly as filed when it cannot.
//   2. NO ALIASES. A US reporter is keyed on their SEC CIK, a real person key,
//      so there is nothing to pool and no canonical to resolve — the requested
//      URL IS the canonical one. The UK file needs `canonical_id` because its
//      ids are slugs of whatever the filer typed.
//   3. TEN-PERCENT OWNERS. A great many US filers are funds and holding
//      companies rather than people, and the copy says so rather than calling
//      Cascade Investment a director.
//
// Every figure and qualification still comes from shared/directors.js, which
// the sitemap also reads.

import { cleanCompanyName } from "../../../shared/sectors.js";
import {
  isEntityName,
  recaseIfShouted,
  usInsiderDisplayName,
} from "../../../shared/us-names.js";
import {
  companySlug,
  DIRECTOR_ROWS,
  directorLeadSentence,
  directorMeetsBar,
  directorPath,
  directorRateSentence,
} from "../../../shared/directors.js";
import { apexHost, esc, noindex, page, renderInto } from "../../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
const OWNING_HOST = "ddbx.us";

const CF = {
  cacheEverything: true,
  cacheTtlByStatus: { "200-299": 900, "400-499": 60, "500-599": 0 },
};

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { cf: CF });

  if (!res.ok) return null;

  return res.json();
}

/** The detail response reduced to what the shared sentences take. `buys` and
 *  `resolved` are the directory's own field names, so one bar reads both
 *  shapes. */
function toSummary(d) {
  return {
    id: d.id,
    name: usInsiderDisplayName(d.name),
    role: d.role,
    company: recaseIfShouted(cleanCompanyName(d.company)),
    buys: (d.prior_picks ?? []).length,
    resolved: d.resolved_count ?? 0,
  };
}

const money = (n) =>
  n == null
    ? "—"
    : n >= 1_000_000
      ? `£${(n / 1_000_000).toFixed(1)}m`
      : n >= 1000
        ? `£${Math.round(n / 1000)}k`
        : `£${Math.round(n)}`;

function prerender(s, detail, host) {
  const rate = directorRateSentence(s);

  const rows = (detail.prior_picks ?? [])
    .slice(0, DIRECTOR_ROWS)
    .map(
      (p) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}/us/company/${esc(companySlug(p.ticker))}">${esc(recaseIfShouted(cleanCompanyName(p.company)))}</a></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(p.trade_date)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(money(p.value_gbp))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(p.analysis?.rating ?? "not rated")}</td>
    </tr>`,
    )
    .join("");

  return page(`
  <h1 style="font-size:28px;margin:0 0 8px">${esc(s.name)}</h1>
  ${isEntityName(detail.name) ? `<p style="font-size:13px;color:#6b6154;margin:0 0 12px">Files as an entity — a fund, trust or holding company rather than an individual.</p>` : ""}
  <p style="font-size:16px;line-height:1.6;max-width:66ch;margin:0 0 16px">${esc(directorLeadSentence(s))}</p>

  <h2 style="font-size:15px;margin:32px 0 8px">How their buying has done</h2>
  ${
    rate
      ? `<p style="font-size:14px;line-height:1.6;max-width:66ch">Hit rate ${Math.round(detail.hit_rate_pct)}%. ${esc(rate)}</p>`
      : `<p style="font-size:14px;line-height:1.6;max-width:66ch">Not enough resolved purchases to state a hit rate yet. Returns are measured from the disclosure-day close at 3, 6, 12 and 24 months, so a recent filing has nothing to report until the clock has run.</p>`
  }

  <h2 style="font-size:15px;margin:32px 0 8px">Their filings</h2>
  <table style="border-collapse:collapse;font-size:14px;width:100%;max-width:720px">
    <thead><tr>
      <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #d8c9b0">Company</th>
      <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #d8c9b0">Bought</th>
      <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #d8c9b0">Value</th>
      <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #d8c9b0">Rating</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#6b6154;max-width:66ch">Only open-market purchases count here (Form 4 transaction code P): shares bought at the price anyone else could have paid. Grants, option exercises and vestings are excluded, because an insider receiving shares has made no decision about the price. Returns are measured from the closing price on the day each filing was disclosed. Past performance is not a reliable indicator of future results.</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/us/directors">Every tracked insider</a> · <a href="https://${esc(host)}/us/companies">Companies</a> · <a href="https://${esc(host)}/how-it-works">How ddbx rates a filing</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const id = decodeURIComponent(String(params.id ?? ""));

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  // UK insiders belong to ddbx.uk. Served elsewhere the page still renders — a
  // link must not 404 — but must not compete with the owning host's copy.
  if (host !== OWNING_HOST) return noindex(shell);
  if (!id) return noindex(shell);

  const detail = await fetchJson(`/directors/us/${encodeURIComponent(id)}`);

  if (!detail || !detail.name) return noindex(shell);

  const s = toSummary(detail);

  // Below the bar the page is a stub: it renders for anyone who follows a link
  // and stays out of the index until there is a record to describe. Same
  // threshold the sitemap applies, so a director is never advertised in one
  // place and withheld in another.
  if (!directorMeetsBar(s)) return noindex(shell);

  // The CIK is already the person's key, so the requested URL is the canonical
  // one — no `canonical_id` to consult, unlike the UK family whose ids are
  // slugs of the filed name and therefore multiply.
  const canonical = `https://${OWNING_HOST}${directorPath(detail.id, "us")}`;

  return renderInto(shell, {
    title: brandTitle(`${s.name} — share purchases and how they performed`),
    description: directorLeadSentence(s),
    canonical,
    breadcrumbs: [
      { name: "Insiders", item: `https://${OWNING_HOST}/us/directors` },
      { name: s.name, item: canonical },
    ],
    body: prerender(s, detail, OWNING_HOST),
  });
}
