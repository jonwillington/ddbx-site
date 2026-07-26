// Dynamic sitemap, served per domain at /sitemap.xml.
//
// It's a Function rather than a static file for two reasons: the URL set is
// host-dependent (ddbx.uk, ddbx.us and ddbx.eu own different markets, and each
// sitemap may only list URLs on its own host), and part of it — the broker
// reviews — comes from the API, so a build-time file would go stale whenever
// the broker table changes without a site deploy.
//
// <lastmod> appears only where it means something: company pages carry the date
// of their most recent dealing, which is exactly when the page last changed.
// The static routes carry none — a timestamp that moves on every request just
// teaches crawlers the field is noise.
//
// Canonical discipline lives in shared/seo.js — every URL listed below must be
// the canonical form for its page, or the sitemap and the rel=canonical tag
// will disagree and Google will trust neither.

import { HOST_DEFAULT_MARKET } from "../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";

// Routes that exist on every domain.
const COMMON_ROUTES = ["/download", "/download/ios", "/download/android"];

// Market dashboards + performance pages, by the host that owns them. Hidden
// markets (/djt) and utility routes (/account-deletion) are intentionally out.
const ROUTES_BY_HOST = {
  "ddbx.uk": ["/", "/portfolio", "/brokers", "/companies"],
  "ddbx.us": ["/", "/congress", "/performance", "/companies"],
  "ddbx.eu": ["/", "/nl", "/performance", "/nl/performance"],
};

/** www.ddbx.uk → ddbx.uk. Each www host shares its apex host's URL set. */
function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

/** Broker review slugs, for ddbx.uk only. A failure here costs us the broker
 *  URLs, not the sitemap — better a short valid document than a 500. */
async function brokerPaths() {
  try {
    const res = await fetch(`${API_BASE}/brokers?market=UK`, {
      headers: { accept: "application/json" },
      // cacheTtlByStatus, not a blanket cacheTtl: `cacheEverything` with a flat
      // TTL pins whatever came back — including a 404 served during a Worker
      // deploy — for the full hour. Errors get a minute so a blip can't hide
      // the data for an hour.
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 3600, "400-499": 60, "500-599": 0 },
      },
    });

    if (!res.ok) return [];
    const body = await res.json();

    return (body.brokers ?? [])
      .map((b) => b.slug)
      .filter((slug) => typeof slug === "string" && slug.length > 0)
      .map((slug) => `/brokers/${slug}`);
  } catch {
    return [];
  }
}

/** Market whose company pages belong on each host. */
const COMPANY_MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };

/** The content bar for company pages.
 *
 *  55% of UK issuers have exactly one dealing, and a page holding one table row
 *  is a thin page — publish hundreds of them and they don't just fail to rank,
 *  they drag the pages that would have. So a company earns a sitemap entry by
 *  having either repeat insider activity or a written analysis on file.
 *
 *  Everything below the bar stays crawlable and internally linked (no noindex)
 *  — issuers cross it on their own as filings arrive, and we'd rather not have
 *  to un-block them later. */
const meetsContentBar = (c) => c.deals >= 2 || c.analysed > 0;

/** Company pages for a host, newest activity first. Same failure posture as
 *  brokerPaths: losing them costs URLs, not the document. */
async function companyEntries(host) {
  const market = COMPANY_MARKET_BY_HOST[host];

  if (!market) return [];
  try {
    const res = await fetch(`${API_BASE}/companies?market=${market}`, {
      headers: { accept: "application/json" },
      // cacheTtlByStatus, not a blanket cacheTtl: `cacheEverything` with a flat
      // TTL pins whatever came back — including a 404 served during a Worker
      // deploy — for the full hour. Errors get a minute so a blip can't hide
      // the data for an hour.
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 3600, "400-499": 60, "500-599": 0 },
      },
    });

    if (!res.ok) return [];
    const body = await res.json();

    return (body.companies ?? [])
      .filter((c) => c.key && meetsContentBar(c))
      .sort((a, b) => String(b.last_trade_date).localeCompare(String(a.last_trade_date)))
      .map((c) => ({
        path: `/company/${market}/${encodeURIComponent(c.key)}`,
        // A real lastmod, unlike the static routes: the date of the most recent
        // dealing is exactly when the page's content last changed.
        lastmod: c.last_trade_date || null,
      }));
  } catch {
    return [];
  }
}

const xmlEscape = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function sitemapXml(origin, entries) {
  const urls = entries
    .map((e) => {
      const { path, lastmod } = typeof e === "string" ? { path: e, lastmod: null } : e;
      const mod = lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : "";

      return `  <url><loc>${xmlEscape(origin + path)}</loc>${mod}</url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);

  // Preview and local hosts get an empty sitemap — robots.txt disallows them
  // wholesale, and a preview build advertising URLs would undercut production.
  if (!(host in HOST_DEFAULT_MARKET)) {
    return new Response(sitemapXml(url.origin, []), {
      headers: { "content-type": "application/xml; charset=utf-8" },
    });
  }

  const paths = [...(ROUTES_BY_HOST[host] ?? ["/"]), ...COMMON_ROUTES];

  if (host === "ddbx.uk") paths.push(...(await brokerPaths()));
  paths.push(...(await companyEntries(host)));

  // Canonical URLs are always apex + https, never the www form the request may
  // have arrived on.
  return new Response(sitemapXml(`https://${host}`, paths), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, max-age=600",
    },
  });
}
