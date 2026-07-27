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

import {
  CATEGORIES,
  categoryMeetsBar,
  categoryPath,
} from "../shared/broker-categories.js";
import {
  brokersForComparison,
  comparisonPath,
  COMPARISONS,
} from "../shared/broker-comparisons.js";
import { entriesForHost, learnPath } from "../shared/glossary.js";
import {
  archiveYears,
  leaderboardPath,
  BOARD_EARLIEST_YEAR,
} from "../shared/leaderboard.js";
import { reportPath } from "../shared/months.js";
import { fetchDealingsWindow } from "../shared/dealings-feed.js";
import {
  sectorMeetsBar,
  sectorPath,
  sectorRollup,
  windowStart,
} from "../shared/sectors.js";
import { HOST_DEFAULT_MARKET } from "../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";

// Routes that exist on every domain.
const COMMON_ROUTES = ["/download", "/download/ios", "/download/android"];

// /developers is deliberately NOT in COMMON_ROUTES. The page is served on every
// host but canonicalises to ddbx.uk/api (see shared/seo.js), and a sitemap
// should list canonical URLs only — listing ddbx.us/developers would contradict
// the rel=canonical the same page emits. So it rides ddbx.uk alone.

// Market dashboards, by the host that owns them. Hidden markets (/djt) and
// utility routes (/account-deletion) are intentionally out.
const ROUTES_BY_HOST = {
  "ddbx.uk": [
    "/",
    "/brokers",
    "/developers",
    "/companies",
    "/sectors",
    "/biggest-buys",
    "/learn",
  ],
  "ddbx.us": [
    "/",
    "/congress",
    "/companies",
    "/sectors",
    "/biggest-buys",
    "/learn",
  ],
  "ddbx.eu": ["/", "/nl"],
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
    const brokers = body.brokers ?? [];

    const reviews = brokers
      .map((b) => b.slug)
      .filter((slug) => typeof slug === "string" && slug.length > 0)
      .map((slug) => `/brokers/${slug}`);

    // A category is listed only if it can field MIN_BROKERS — the same bar the
    // page and its pre-render apply. Badges are edited in ddbx-data, so a
    // category can fall below the bar without a site deploy; deriving the list
    // from live data rather than hardcoding it means the sitemap stops
    // advertising it on the next request instead of the next release.
    const categories = CATEGORIES.filter((c) =>
      categoryMeetsBar(c, brokers),
    ).map((c) => categoryPath(c.slug));

    // Likewise a head-to-head needs both platforms present — half a comparison
    // is a verdict about a platform whose figures aren't on the page.
    const comparisons = COMPARISONS.filter((c) =>
      brokersForComparison(c, brokers),
    ).map((c) => comparisonPath(c.slug));

    return [...reviews, ...categories, ...comparisons];
  } catch {
    return [];
  }
}

/** Market whose company pages belong on each host. */
const COMPANY_MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };

/** The monthly report archive for a host.
 *
 *  `created_at` is a genuine lastmod: a report is generated once and then
 *  doesn't change, so the date it was written is exactly when the page last
 *  changed. Same failure posture as the other API-backed sections — losing
 *  these costs URLs, not the document.
 *
 *  Only the `/reports/<slug>` form is listed. The older `/report/<slug>`
 *  deep-link still resolves but canonicalises here (see canonicalUrlFor), and
 *  a sitemap that advertises a non-canonical URL argues with its own
 *  rel=canonical. */
async function reportEntries(host) {
  const market = COMPANY_MARKET_BY_HOST[host];

  if (!market) return [];
  try {
    const res = await fetch(
      `${API_BASE}/monthly-summaries${market === "US" ? "?market=US" : ""}`,
      {
        headers: { accept: "application/json" },
        cf: {
          cacheEverything: true,
          cacheTtlByStatus: { "200-299": 3600, "400-499": 60, "500-599": 0 },
        },
      },
    );

    if (!res.ok) return [];
    const body = await res.json();

    return (body.summaries ?? [])
      .filter((s) => s.month)
      .map((s) => ({
        path: reportPath(s.month),
        lastmod: (s.created_at ?? "").slice(0, 10) || null,
      }));
  } catch {
    return [];
  }
}

/** Sector hubs that clear the activity bar for a host.
 *
 *  Derived from live data rather than hardcoded to the 11 ICB values: a sector
 *  with almost no disclosed activity is a stub, and which sectors are quiet
 *  changes month to month without a deploy. Same threshold — and the same
 *  paged window — the page and its pre-render apply, so a sector is never
 *  advertised here and withheld there. When the window can't be fully covered
 *  we emit nothing rather than a half-computed set. */
async function sectorEntries(host) {
  const market = COMPANY_MARKET_BY_HOST[host];

  if (!market) return [];
  try {
    const { dealings, complete } = await fetchDealingsWindow({
      apiBase: API_BASE,
      market,
      since: windowStart(new Date()),
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 3600, "400-499": 60, "500-599": 0 },
      },
    });

    if (!complete) return [];

    return sectorRollup(dealings)
      .filter(sectorMeetsBar)
      .map((row) => sectorPath(row.sector.slug));
  } catch {
    return [];
  }
}

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
        // Public URL shape: market comes from the domain, the LSE ".L"
        // suffix is dropped. Mirrors tickerToSlug in src/lib/company.ts.
        path: `/company/${encodeURIComponent(String(c.key).replace(/\.L$/i, "").toLowerCase())}`,
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
  // Year leaderboards, on the two hosts that own /biggest-buys. Derived from
  // the same helper the boards' own archive links use, so a new year appears in
  // the sitemap and in the page's navigation at the same moment. Years start at
  // the first one with stored filings — the pre-render noindexes an empty
  // board, and advertising a URL we then decline to index is the one thing the
  // sitemap must not do.
  if (COMPANY_MARKET_BY_HOST[host]) {
    paths.push(
      ...archiveYears(BOARD_EARLIEST_YEAR, new Date()).map((y) =>
        leaderboardPath(y),
      ),
    );
  }
  paths.push(...(await companyEntries(host)));
  // `/reports` rides with the month entries: the index pre-render noindexes an
  // empty archive (US today), and advertising a URL we then decline to index
  // is the one thing the sitemap must not do.
  const reports = await reportEntries(host);

  if (reports.length > 0) paths.push("/reports", ...reports);
  paths.push(...(await sectorEntries(host)));
  // Glossary entries appear only in their owning host's sitemap — the whole
  // point of the ownership rule is that no entry exists at two URLs.
  paths.push(...entriesForHost(host).map((e) => learnPath(e.slug)));

  // Canonical URLs are always apex + https, never the www form the request may
  // have arrived on.
  return new Response(sitemapXml(`https://${host}`, paths), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, max-age=600",
    },
  });
}
