// robots.txt, served per domain.
//
// Before this existed the SPA fallback in public/_redirects answered /robots.txt
// with index.html — a 200 of HTML where crawlers expect text, and no sitemap
// pointer anywhere on the site.
//
// It's host-aware because the Sitemap directive must name the same host that
// served the file (a cross-host sitemap needs separate Search Console
// verification to be honoured), and because preview deployments should be
// disallowed outright rather than left to compete with the live domains.
//
// NOT disallowed: /t/{id}. Those share links exist to be unfurled, and
// Twitterbot honours robots.txt — blocking them would break the preview cards
// that shared trades depend on.

import { HOST_DEFAULT_MARKET } from "../shared/seo.js";

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);
  const isProduction = host in HOST_DEFAULT_MARKET;

  const body = isProduction
    ? `User-agent: *
Allow: /
Disallow: /account-deletion

Sitemap: https://${host}/sitemap.xml
`
    : `User-agent: *
Disallow: /
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, s-maxage=3600, max-age=600",
    },
  });
}
