// Crawler pre-render for the company index: ddbx.uk/companies, ddbx.us/companies.
//
// The page is a React route (src/pages/companies.tsx) so it inherits the
// site's chrome and design language. This Function does for it what
// functions/company/[key].js does for a company page: per-page <head> copy,
// and the actual links injected into #root so a crawler that doesn't run JS
// still finds every company page.
//
// The links are the point. Without them the ~575 company pages would be
// sitemap-only orphans — discoverable in principle, weakly signalled in
// practice. This is the hub in the hub-and-spoke.
//
// The head/breadcrumb/escape/fetch primitives come from shared/prerender.js.
// This Function used to carry private copies of all of them, which is how its
// cleanCompany() ended up a fix behind src/lib/company.ts (see below) and how
// it ended up the only pre-rendered page in the family emitting no
// BreadcrumbList — while functions/company/[key].js names it as a crumb.

import {
  apexHost,
  esc,
  fetchJson,
  noindex,
  page,
  renderInto,
} from "../shared/prerender.js";
import { brandTitle } from "../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";

const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };
const FILING_NOUN = { UK: "director dealings", US: "insider trading" };

/** Mirrors meetsContentBar in functions/sitemap.xml.js and companies.tsx. */
const meetsContentBar = (c) => c.deals >= 2 || c.analysed > 0;

/** Display name, cleaned of the noise each source appends. Mirrors
 *  `cleanCompanyName` in src/lib/company.ts and the copy in
 *  functions/company/[key].js — including the loop.
 *
 *  The single-pass version that used to live here is the same drift that copy
 *  documents: names routinely carry TWO trailing parentheticals ("Jardine
 *  Matheson Holdings Ltd (Singapore Reg) (JAR)"), so one pass stripped only the
 *  ticker and the crawler was served a name the reader never sees — and the
 *  injected list was alphabetised by that different string. */
const cleanCompany = (c) => {
  let out = String(c ?? "").trim();

  for (;;) {
    const next = out
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
      .trim();

    // Never strip the whole name away: a company literally called "(BLANK)"
    // should render as it arrived rather than as an empty string.
    if (next === out || next === "") return out;
    out = next;
  }
};

const tickerToSlug = (key) =>
  String(key ?? "")
    .replace(/\.L$/i, "")
    .toLowerCase();

function prerender(market, companies) {
  const items = companies
    .slice()
    .sort((a, b) =>
      cleanCompany(a.company).localeCompare(cleanCompany(b.company)),
    )
    .map(
      (c) =>
        `<li><a href="/company/${esc(tickerToSlug(c.key))}">${esc(cleanCompany(c.company) || c.key)}</a> — ${c.deals} ${c.deals === 1 ? "buy" : "buys"}</li>`,
    )
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">Every ${esc(market)} company with ${esc(FILING_NOUN[market])}</h1>
  <ul style="font-size:14px;line-height:1.9;columns:2">${items}</ul>`);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);
  const market = MARKET_BY_HOST[host];
  const shell = await context.next();

  // ddbx.eu has no company pages, and neither does a preview host — the SPA
  // renders what it renders for an unknown route, and we keep it out of the
  // index. /companies is on the middleware's skip list, so this Function is the
  // only thing that can set robots on this URL.
  if (!market) return noindex(shell);

  const data = await fetchJson(`${API_BASE}/companies?market=${market}`, 3600);
  const companies = (data?.companies ?? []).filter(
    (c) => c.key && meetsContentBar(c),
  );

  // No data — a failed fetch, or nothing clearing the content bar. The page
  // still works (React fetches the same endpoint on mount), but without this
  // the response ships index.html's static <head>: the UK homepage title, the
  // UK description, no canonical and no og:url, which on ddbx.us means the US
  // company index published under a UK title. Same posture as
  // functions/sectors/index.js — the URL is legitimate, a bare mismatched
  // shell is not worth indexing.
  if (companies.length === 0) return noindex(shell);

  const canonical = `https://${host}/companies`;
  const title = brandTitle(
    `Every ${market} company with ${FILING_NOUN[market]} — ${companies.length} issuers`,
  );
  const description = `Browse ${companies.length} ${market} companies whose ${market === "UK" ? "directors" : "insiders"} have bought shares, with the filings, ratings and company stats for each.`;

  return renderInto(shell, {
    title,
    description,
    canonical,
    breadcrumbs: [
      { name: `${market} ${FILING_NOUN[market]}`, item: `https://${host}/` },
      { name: "Companies", item: canonical },
    ],
    body: prerender(market, companies),
  });
}
