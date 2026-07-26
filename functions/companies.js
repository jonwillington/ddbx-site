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

import { brandTitle } from "../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";

const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };
const FILING_NOUN = { UK: "director dealings", US: "insider trading" };

/** Mirrors meetsContentBar in functions/sitemap.xml.js and companies.tsx. */
const meetsContentBar = (c) => c.deals >= 2 || c.analysed > 0;

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const cleanCompany = (c) =>
  String(c ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
    .trim();

const tickerToSlug = (key) =>
  String(key ?? "")
    .replace(/\.L$/i, "")
    .toLowerCase();

const setContent = (value) => ({
  element(el) {
    el.setAttribute("content", value);
  },
});

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

  return `<div style="max-width:900px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1E1506">
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">Every ${esc(market)} company with ${esc(FILING_NOUN[market])}</h1>
  <ul style="font-size:14px;line-height:1.9;columns:2">${items}</ul>
</div>`;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);
  const market = MARKET_BY_HOST[host];
  const shell = await context.next();

  // ddbx.eu has no company pages — the SPA renders what it renders for an
  // unknown route, and we keep it out of the index.
  if (!market) {
    return new HTMLRewriter()
      .on("head", {
        element(el) {
          el.append('<meta name="robots" content="noindex, follow">', {
            html: true,
          });
        },
      })
      .transform(shell);
  }

  let companies = null;

  try {
    const res = await fetch(`${API_BASE}/companies?market=${market}`, {
      headers: { accept: "application/json" },
      // cacheTtlByStatus, not a blanket cacheTtl: `cacheEverything` with a flat
      // TTL pins whatever came back — including a 404 served while a Worker
      // deploy rolls out — for the full hour.
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 3600, "400-499": 60, "500-599": 0 },
      },
    });

    if (res.ok) {
      const body = await res.json();

      companies = (body.companies ?? []).filter(
        (c) => c.key && meetsContentBar(c),
      );
    }
  } catch {
    /* fall through — the SPA fetches the list for itself */
  }

  // No pre-render without data, but the page still works: React fetches the
  // same endpoint on mount. Nothing to noindex — the URL is legitimate either
  // way.
  if (!companies) return shell;

  const canonical = `https://${host}/companies`;
  const title = brandTitle(
    `Every ${market} company with ${FILING_NOUN[market]} — ${companies.length} issuers`,
  );
  const description = `Browse ${companies.length} ${market} companies whose ${market === "UK" ? "directors" : "insiders"} have bought shares, with the filings, ratings and company stats for each.`;

  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(title);
      },
    })
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(description))
    .on("head", {
      element(el) {
        el.append(
          [
            `<link rel="canonical" href="${esc(canonical)}">`,
            `<meta property="og:url" content="${esc(canonical)}">`,
            `<meta name="twitter:title" content="${esc(title)}">`,
            `<meta name="twitter:description" content="${esc(description)}">`,
          ].join("\n"),
          { html: true },
        );
      },
    })
    .on("#root", {
      element(el) {
        el.setInnerContent(prerender(market, companies), { html: true });
      },
    })
    .transform(shell);
}
