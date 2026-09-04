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
import {
  committeeMeetsBar,
  committeePath,
  committeeSlug,
  memberMeetsBar,
  memberPath,
  memberSlug,
  membersOnCommittee,
} from "../shared/congress.js";
import { filingPath } from "../shared/filings.js";
import { weekPath } from "../shared/weeks.js";
import { entriesForHost, learnPath } from "../shared/glossary.js";
import {
  archiveYears,
  leaderboardPath,
  BOARD_EARLIEST_YEAR,
} from "../shared/leaderboard.js";
import { reportPath } from "../shared/months.js";
import { fetchDealingsWindow } from "../shared/dealings-feed.js";
import {
  rankByAlpha,
  rankClusters,
  rankCompanies,
} from "../shared/boards.js";
import {
  inRole,
  rolePath,
  rolesForMarket,
  MIN_FILINGS as MIN_ROLE_FILINGS,
} from "../shared/roles.js";
import {
  bandMeetsBar,
  bandPath,
  bandRollup,
} from "../shared/cap-bands.js";
import {
  sectorMeetsBar,
  sectorPath,
  sectorRollup,
  windowStart,
} from "../shared/sectors.js";
import {
  HOST_DEFAULT_MARKET,
  marketPublishesBrokers,
} from "../shared/seo.js";

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
  // /how-it-works is per-host rather than a COMMON_ROUTE: ddbx.uk and ddbx.us
  // publish materially different documents (different regulator, exchange and
  // noun for the filer), while ddbx.eu 301s to ddbx.uk because SE and NL run no
  // analysis layer for it to describe.
  "ddbx.uk": [
    "/",
    // NOTE: /brokers is NOT here. The broker index rides the same publication
    // rule as the review URLs below it (BROKER_DIRECTORY_MARKET_IDS in
    // shared/seo.js), so brokerPaths() adds it for whichever hosts publish a
    // directory. Hardcoding it here would have listed ddbx.uk's index while a
    // future ddbx.us index stayed invisible.
    "/developers",
    "/companies",
    "/sectors",
    "/biggest-buys",
    "/learn",
    "/how-it-works",
    // Same rule as /developers above: cross-market page, canonicalises to
    // ddbx.uk, so it rides this host alone rather than joining COMMON_ROUTES.
    "/status",
    // Traditional Chinese edition of the install pages (Hong Kong). NOT a
    // COMMON_ROUTE: they sell the UK app and canonicalise to ddbx.uk on every
    // host, so listing them under ddbx.us would contradict their own
    // rel=canonical — the same rule /developers and /status follow above.
    "/zh-hk/download",
    "/zh-hk/download/ios",
    "/zh-hk/download/android",
  ],
  "ddbx.us": [
    "/",
    "/congress",
    "/companies",
    "/sectors",
    "/biggest-buys",
    "/learn",
    "/how-it-works",
  ],
  "ddbx.eu": ["/", "/nl"],
};

/** www.ddbx.uk → ddbx.uk. Each www host shares its apex host's URL set. */
function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

/** Wire market whose broker directory belongs on each host, mirroring
 *  COMPANY_MARKET_BY_HOST below. A host absent here never lists broker URLs. */
const BROKER_MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };

/** Per-market editorial catalogues. The UK's categories and head-to-heads are
 *  written around ISAs, SIPPs and percentage platform fees, so they are UK
 *  modules rather than a shared catalogue with market flags on each row — a US
 *  entry joins as its own module here, not as a branch inside the UK one. */
const BROKER_CATALOGUE_BY_MARKET = {
  UK: { categories: CATEGORIES, comparisons: COMPARISONS },
};

/** Broker index, review, category and head-to-head URLs for one host.
 *
 *  Empty unless the host's market both publishes a directory (shared/seo.js) and
 *  has an editorial catalogue here — the sitemap must not advertise a URL whose
 *  rel=canonical points at another host, which is exactly what listing US
 *  broker pages before BROKER_DIRECTORY_MARKET_IDS gains "us" would do.
 *
 *  A failure here costs us the broker URLs, not the sitemap — better a short
 *  valid document than a 500. */
async function brokerPaths(host) {
  const market = BROKER_MARKET_BY_HOST[host];

  if (!market) return [];
  if (!marketPublishesBrokers(market.toLowerCase())) return [];

  const catalogue = BROKER_CATALOGUE_BY_MARKET[market];

  if (!catalogue) return [];

  try {
    const res = await fetch(`${API_BASE}/brokers?market=${market}`, {
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
    const categories = catalogue.categories
      .filter((c) => categoryMeetsBar(c, brokers))
      .map((c) => categoryPath(c.slug));

    // Likewise a head-to-head needs both platforms present — half a comparison
    // is a verdict about a platform whose figures aren't on the page.
    const comparisons = catalogue.comparisons
      .filter((c) => brokersForComparison(c, brokers))
      .map((c) => comparisonPath(c.slug));

    // The index rides with the rest: if the fetch failed we list no /brokers
    // either, rather than advertising an index for an empty directory.
    return ["/brokers", ...reviews, ...categories, ...comparisons];
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
/** The three derived boards and the role hubs.
 *
 *  ONE fetch for all four, not four. They rank the same twelve-month window and
 *  differ only in how they group it, so a fetch each would pull the same
 *  thousand rows four times to answer four questions about them.
 *
 *  Each family applies its own bar, and the bar is the one its pre-render
 *  applies — a board is never advertised here and then noindexed there. The
 *  role hubs additionally resolve against the market's own bucket list, because
 *  /roles/chair exists on ddbx.uk and does not exist on ddbx.us. */
async function boardEntries(host) {
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

    // A partial window can only under-count, and every bar below is a minimum.
    // Emitting a half-computed set risks advertising a board the pre-render
    // will decline to index.
    if (!complete) return [];

    const paths = [];

    if (rankByAlpha(dealings, market).rows.length > 0) {
      paths.push("/best-performing-buys");
    }
    if (rankCompanies(dealings, market).rows.length > 0) {
      paths.push("/most-active-companies");
    }
    if (rankClusters(dealings, market).rows.length > 0) {
      paths.push("/cluster-buys");
    }

    const roles = rolesForMarket(market).filter(
      (role) =>
        dealings.filter((d) => inRole(d, market, role.slug)).length >=
        MIN_ROLE_FILINGS,
    );

    if (roles.length > 0) {
      paths.push("/roles", ...roles.map((role) => rolePath(role.slug)));
    }

    return paths;
  } catch {
    return [];
  }
}

/** Size bands that clear the company bar for a host.
 *
 *  Reads /api/companies, which is the one call the whole family makes — no
 *  dealings window. Same bar the pages and the pre-render apply, so a band is
 *  never advertised here and noindexed there. */
async function capBandEntries(host) {
  const market = COMPANY_MARKET_BY_HOST[host];

  if (!market) return [];
  try {
    const res = await fetch(`${API_BASE}/companies?market=${market}`, {
      headers: { accept: "application/json" },
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 3600, "400-499": 60, "500-599": 0 },
      },
    });

    if (!res.ok) return [];
    const body = await res.json();
    const rollup = bandRollup(body.companies ?? [], market);
    const bands = rollup.bands.filter(bandMeetsBar);

    if (bands.length === 0) return [];

    return ["/market-cap", ...bands.map((b) => bandPath(b.band.slug))];
  } catch {
    return [];
  }
}

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

/** Weekly digests: the index plus every stored week.
 *
 *  UK on ddbx.uk, US on ddbx.us. No content bar of its own — buildWeeklyDigest
 *  returns null for a week with nothing worth saying, so a stored row IS a
 *  publishable week and the pre-render will index exactly this set.
 *
 *  `lastmod` is the week end: a digest is generated once for a closed week and
 *  does not change afterwards.
 *
 *  The index rides with its entries. An archive hub advertised with no children
 *  is the one thing a sitemap must not do. */
async function weeklyEntries(host) {
  const market = COMPANY_MARKET_BY_HOST[host];

  if (!market) return [];
  try {
    const res = await fetch(`${API_BASE}/weekly-digests?market=${market}`, {
      headers: { accept: "application/json" },
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 3600, "400-499": 60, "500-599": 0 },
      },
    });

    if (!res.ok) return [];
    const { weeks } = await res.json();

    if (!weeks?.length) return [];

    return [
      { path: "/weekly", lastmod: weeks[0].week_end || null },
      ...weeks.map((w) => ({
        path: weekPath(w.week_start),
        lastmod: w.week_end || null,
      })),
    ];
  } catch {
    return [];
  }
}

/** Per-filing pages: every UK disclosure carrying a written analysis.
 *
 *  Three rating-filtered calls rather than one paged walk over the whole feed.
 *  `rating=` returns exactly the analysed set for that band, which IS the
 *  publishing bar (see filingMeetsBar in shared/filings.js), so the sitemap
 *  cannot drift from what the pre-render will actually index. 310 UK rows
 *  today; each call is edge-cached for an hour.
 *
 *  ddbx.uk only. /api/dealings/:id serves the UK pipeline and there is no US
 *  per-row detail route yet, so a ddbx.us filing page would 404 against the API
 *  rather than render. When that route lands, add the host here and in
 *  functions/dealings/[id].js together.
 *
 *  `lastmod` is the disclosure date: the facts on the page are fixed at
 *  disclosure, and the outcome section moves with the market rather than with
 *  an edit, so a lastmod that tracked the price mark would tell crawlers the
 *  document changed every day. */
const RATED_BANDS = ["significant", "noteworthy", "minor"];

async function filingEntries(host) {
  if (host !== "ddbx.uk") return [];
  try {
    const pages = await Promise.all(
      RATED_BANDS.map((rating) =>
        fetch(`${API_BASE}/dealings?rating=${rating}&limit=1000`, {
          headers: { accept: "application/json" },
          cf: {
            cacheEverything: true,
            cacheTtlByStatus: { "200-299": 3600, "400-499": 60, "500-599": 0 },
          },
        }).then((r) => (r.ok ? r.json() : null)),
      ),
    );

    // One band failing would silently drop a third of the family, so a partial
    // result publishes nothing rather than a set that looks complete.
    if (pages.some((p) => !p)) return [];

    const seen = new Set();
    const out = [];

    for (const p of pages) {
      for (const d of p.dealings ?? []) {
        if (!d.id || seen.has(d.id)) continue;
        seen.add(d.id);
        out.push({ path: filingPath(d.id), lastmod: d.disclosed_date || null });
      }
    }

    return out;
  } catch {
    return [];
  }
}

/** The Congress directory: the member and committee pages that clear their bars.
 *
 *  ddbx.us only — the USG market is mounted on the US domain, so listing these
 *  on ddbx.uk would contradict the rel=canonical the same pages emit.
 *
 *  Both bars are the ones shared/congress.js defines and the pre-render
 *  Functions apply, so a member or a committee is never advertised here and
 *  then noindexed on arrival. `lastmod` is the member's most recent filing
 *  date, which is exactly when their page last changed.
 *
 *  Failure posture matches brokerPaths and sectorEntries: an outage costs URLs,
 *  not the document. */
async function congressEntries(host) {
  if (host !== "ddbx.us") return [];
  try {
    const cf = {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 3600, "400-499": 60, "500-599": 0 },
    };
    const [membersRes, committeesRes] = await Promise.all([
      fetch(`${API_BASE}/gov-members`, {
        headers: { accept: "application/json" },
        cf,
      }),
      fetch(`${API_BASE}/gov-committees`, {
        headers: { accept: "application/json" },
        cf,
      }),
    ]);

    if (!membersRes.ok) return [];
    const { members } = await membersRes.json();

    if (!members?.length) return [];

    const entries = [{ path: "/congress/members", lastmod: null }];

    for (const m of members) {
      if (!memberMeetsBar(m)) continue;
      entries.push({
        path: memberPath(memberSlug(m.name, m.id)),
        lastmod: m.stats.last_disclosed || null,
      });
    }

    // The committee index rides with its entries: if the lane map is
    // unavailable we publish neither, rather than advertising a hub whose
    // children are missing.
    if (committeesRes.ok) {
      const { committees } = await committeesRes.json();
      const published = (committees ?? []).filter((c) =>
        committeeMeetsBar(membersOnCommittee(members, c.committee)),
      );

      if (published.length > 0) {
        entries.push({ path: "/congress/committees", lastmod: null });
        for (const c of published) {
          entries.push({
            path: committeePath(committeeSlug(c.committee)),
            lastmod: null,
          });
        }
      }
    }

    return entries;
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

  paths.push(...(await brokerPaths(host)));
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
  paths.push(...(await boardEntries(host)));
  paths.push(...(await capBandEntries(host)));
  paths.push(...(await sectorEntries(host)));
  paths.push(...(await congressEntries(host)));
  paths.push(...(await filingEntries(host)));
  paths.push(...(await weeklyEntries(host)));
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
