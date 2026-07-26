// Crawler pre-render for company pages: ddbx.uk/company/mtln, ddbx.us/company/fcnca.
//
// The page itself is a React route (src/pages/company.tsx) so it gets the
// site's navbar, footer and editorial design language for free. That leaves
// one problem: a crawler fetching a SPA route sees an empty <div id="root">.
// This Function fixes that without a second design — it fetches the same API
// bundle React uses, then rewrites the shell:
//
//   1. <title>, description, canonical, OG/Twitter — per company, not the
//      generic route-table copy the middleware would apply
//   2. the facts, as plain semantic HTML, injected INTO #root
//
// React replaces (2) the moment it mounts, so users see the real page and
// non-JS crawlers see the content. Same URL, same facts, no user-agent
// sniffing. The injected markup carries just enough inline styling that a slow
// connection sees a simplified page rather than a broken one.
//
// The market comes from the domain and the LSE ".L" suffix is added back here
// — mirrors tickerToSlug/slugToKey in src/lib/company.ts.

import { brandTitle } from "../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";

const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };
const FILING_NOUN = { UK: "director dealings", US: "insider trading" };

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

/** "mtln" + UK -> "MTLN.L"; "fcnca" + US -> "FCNCA". */
function slugToKey(slug, market) {
  const bare = String(slug ?? "").toUpperCase();

  if (market !== "UK") return bare;

  return bare.endsWith(".L") ? bare : `${bare}.L`;
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

const displayTicker = (k) => String(k ?? "").replace(/\.L$/i, "");

const SYMBOL = { GBP: "£", USD: "$", EUR: "€" };

function moneyShort(value, currency = "GBP") {
  const n = Number(value);

  if (!isFinite(n) || n === 0) return "—";
  const sym = SYMBOL[currency] ?? "";

  if (n >= 1_000_000) {
    const m = n / 1_000_000;

    return `${sym}${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}k`;

  return `${sym}${Math.round(n)}`;
}

function money(value, currency = "GBP") {
  const n = Number(value);

  if (!isFinite(n) || n === 0) return "—";

  return `${SYMBOL[currency] ?? ""}${Math.round(n).toLocaleString("en-GB")}`;
}

function fmtDate(iso, market) {
  try {
    return new Intl.DateTimeFormat(market === "US" ? "en-US" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso ?? "—";
  }
}

function monthYear(iso, market) {
  try {
    return new Intl.DateTimeFormat(market === "US" ? "en-US" : "en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso ?? "";
  }
}

const personName = (deal) => deal.director?.name ?? deal.reporter?.name ?? "—";

function personRole(deal) {
  if (deal.director?.role) return deal.director.role;
  const r = deal.reporter;

  if (!r) return "";
  if (r.officer_title) return r.officer_title;

  return (r.roles ?? [])
    .map((x) => (x === "ten_percent_owner" ? "10% owner" : x))
    .join(", ");
}

const dealValue = (deal, market) =>
  market === "UK" ? deal.value_gbp : deal.value;

/** The lead sentence, plain text — also the meta description. Templated from
 *  real numbers rather than model-written: at this page count the API spend
 *  would be real, and mass-generated prose is what search engines demote. */
function leadSentence(d) {
  const { market, summary } = d;
  const name = cleanCompany(d.company);
  const people = summary.people;
  const noun =
    market === "UK"
      ? people === 1
        ? "director"
        : "directors"
      : people === 1
        ? "insider"
        : "insiders";
  const since = summary.first_trade_date
    ? ` since ${monthYear(summary.first_trade_date, market)}`
    : "";

  let s = `${people} ${noun} ${people === 1 ? "has" : "have"} bought ${moneyShort(summary.total_value, summary.currency)} of ${name} shares across ${summary.deals} ${summary.deals === 1 ? "disclosed dealing" : "disclosed dealings"}${since}.`;

  if (summary.analysed) {
    s += ` ${summary.analysed} of those ${summary.analysed === 1 ? "has been" : "have been"} scored against our six-point signal check.`;
  }
  if (summary.congress_trades) {
    s += ` ${summary.congress_trades} congressional ${summary.congress_trades === 1 ? "trade has" : "trades have"} also been disclosed in this ticker.`;
  }

  return s;
}

/** Semantic pre-render. No classes — React owns the real presentation; these
 *  inline styles only keep the sub-second pre-hydration view legible. */
function prerender(d) {
  const { market } = d;
  const name = cleanCompany(d.company);
  const ticker = displayTicker(d.key);
  const rows = d.deals
    .map(
      (deal) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(fmtDate(deal.trade_date, market))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(personName(deal))}${personRole(deal) ? ` — ${esc(personRole(deal))}` : ""}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf;text-align:right">${esc(money(dealValue(deal, market), market === "UK" ? "GBP" : "USD"))}</td>
    </tr>`,
    )
    .join("");

  const news = (d.news?.items ?? [])
    .slice(0, 6)
    .map((n) => `<li><a href="${esc(n.url)}" rel="nofollow">${esc(n.title)}</a></li>`)
    .join("");

  const marketHome = market === "US" ? "https://ddbx.us/" : "https://ddbx.uk/";

  return `<div style="max-width:900px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1E1506">
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(name)} (${esc(ticker)}) ${esc(FILING_NOUN[market])}</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(leadSentence(d))}</p>
  <h2 style="font-size:15px;margin:32px 0 10px">${market === "UK" ? "Director" : "Insider"} buys</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>${rows}</tbody></table>
  ${d.stats?.description ? `<h2 style="font-size:15px;margin:32px 0 10px">About ${esc(name)}</h2><p style="font-size:14px;line-height:1.65;color:#4a4034">${esc(d.stats.description)}</p>` : ""}
  ${news ? `<h2 style="font-size:15px;margin:32px 0 10px">Recent news</h2><ul style="font-size:14px;line-height:1.8">${news}</ul>` : ""}
  <p style="margin-top:32px;font-size:14px"><a href="${esc(marketHome)}companies">Browse every company</a> · <a href="${esc(marketHome)}">All ${esc(FILING_NOUN[market])}</a></p>
</div>`;
}

/** Breadcrumbs — the one bit of structured data these pages genuinely support. */
function breadcrumbLd(market, company, url, host) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: `${market} ${FILING_NOUN[market]}`,
        item: `https://${host}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Companies",
        item: `https://${host}/companies`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cleanCompany(company),
        item: url,
      },
    ],
  }).replace(/</g, "\\u003c");
}

const setContent = (value) => ({
  element(el) {
    el.setAttribute("content", value);
  },
});

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  // Non-production hosts (preview, local) still render the SPA — they just
  // don't get the pre-render, and robots.txt disallows them anyway.
  const market = MARKET_BY_HOST[host] ?? "UK";
  const key = slugToKey(decodeURIComponent(String(params.key ?? "")), market);

  // The SPA shell. React boots from this and takes over whatever we inject.
  const shell = await context.next();

  let data = null;

  try {
    const res = await fetch(
      `${API_BASE}/company/${market}/${encodeURIComponent(key)}/page`,
      {
        headers: { accept: "application/json" },
        // Errors expire fast — a 404 served during a Worker deploy must not
        // outlive the deploy (see functions/companies.js).
        cf: {
          cacheEverything: true,
          cacheTtlByStatus: { "200-299": 1800, "400-499": 60, "500-599": 0 },
        },
      },
    );

    if (res.ok) data = await res.json();
  } catch {
    /* fall through — the SPA still renders, it just fetches for itself */
  }

  // Unknown company: let the SPA render its own "not found" state, but keep it
  // out of the index rather than leaving a bare shell to be crawled.
  if (!data) {
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

  const name = cleanCompany(data.company);
  const ticker = displayTicker(data.key);
  const canonical = `https://${host}/company/${encodeURIComponent(String(params.key ?? "").toLowerCase())}`;
  const title = brandTitle(
    `${name} (${ticker}) ${FILING_NOUN[market]} — ${data.summary.deals} insider ${data.summary.deals === 1 ? "buy" : "buys"}`,
  );
  const description = leadSentence(data);

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
            `<meta property="og:site_name" content="ddbx">`,
            `<meta name="twitter:title" content="${esc(title)}">`,
            `<meta name="twitter:description" content="${esc(description)}">`,
            `<script type="application/ld+json">${breadcrumbLd(market, data.company, canonical, host)}</script>`,
          ].join("\n"),
          { html: true },
        );
      },
    })
    .on("#root", {
      element(el) {
        el.setInnerContent(prerender(data), { html: true });
      },
    })
    .transform(shell);
}
