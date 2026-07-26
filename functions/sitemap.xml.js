// Dynamic sitemap, served per domain at /sitemap.xml.
//
// It's a Function rather than a static file for two reasons: the URL set is
// host-dependent (ddbx.uk, ddbx.us and ddbx.eu own different markets, and each
// sitemap may only list URLs on its own host), and part of it — the broker
// reviews — comes from the API, so a build-time file would go stale whenever
// the broker table changes without a site deploy.
//
// Deliberately omits <lastmod>: a timestamp that changes on every request
// teaches crawlers the field is meaningless, which is worse than not sending
// it. When company pages land here they'll carry a real per-company lastmod
// from the API.
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
  "ddbx.uk": ["/", "/portfolio", "/brokers"],
  "ddbx.us": ["/", "/congress", "/performance"],
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
      cf: { cacheTtl: 3600, cacheEverything: true },
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

const xmlEscape = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function sitemapXml(origin, paths) {
  const urls = paths
    .map((p) => `  <url><loc>${xmlEscape(origin + p)}</loc></url>`)
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

  // Canonical URLs are always apex + https, never the www form the request may
  // have arrived on.
  return new Response(sitemapXml(`https://${host}`, paths), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, max-age=600",
    },
  });
}
