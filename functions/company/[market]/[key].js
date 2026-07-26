// Server-rendered company pages: /company/UK/MTLN.L, /company/US/FCNCA.
//
// These are the site's programmatic SEO surface — roughly 575 issuers that
// clear the content bar across UK and US. They're a Pages Function rather than
// a React route for the same reason functions/t/[id].js is: the site is a
// client-rendered SPA, so a crawler fetching a React route sees an empty
// <div id="root"> and the content only lands if and when Google's render queue
// gets to it. At this page count that's the difference between being indexed
// and not. Everyone gets identical HTML — no user-agent sniffing.
//
// All the data arrives in ONE request to /api/company/:market/:key/page, which
// is cached at the Worker's edge for 30 minutes. A full crawl of the set is
// therefore ~575 subrequests and, on a warm cache, no D1 reads.
//
// functions/_middleware.js deliberately skips /company/ — this file owns its
// own <head>, and the middleware's route-table title would otherwise overwrite
// the per-company one.

const API_BASE = "https://api.ddbx.uk/api";

// Which domain each market's pages belong to. Cross-domain canonical, same
// rule as shared/seo.js: UK issuers are ddbx.uk pages, US issuers ddbx.us.
const MARKET_HOST = { UK: "ddbx.uk", US: "ddbx.us" };
const MARKET_LABEL = { UK: "UK", US: "US" };
// UK filings are PDMR disclosures under MAR; US ones are SEC Form 4s. Using the
// right noun on each page also matches what people actually search for.
const FILING_NOUN = { UK: "director dealings", US: "insider trading" };

const LOGO_DEV_TOKEN = "pk_aFXx8Wx5TrenY0XbJuUMrA";
const TICKER_LOGO_DOMAIN = {
  "BRK.B": "berkshirehathaway.com",
  "BRK.A": "berkshirehathaway.com",
};

const GA_IDS = {
  "ddbx.eu": "G-0R0DR69FXM",
  "www.ddbx.eu": "G-0R0DR69FXM",
  "ddbx.uk": "G-0TQE914NMD",
  "www.ddbx.uk": "G-0TQE914NMD",
  "ddbx.us": "G-0HHXDL7DE2",
  "www.ddbx.us": "G-0HHXDL7DE2",
};
const FALLBACK_GA_ID = "G-0TQE914NMD";
const gaIdForHost = (host) => GA_IDS[String(host).toLowerCase()] || FALLBACK_GA_ID;

// Rating display + legacy aliases (mirrors src/components/rating-badge.tsx and
// functions/t/[id].js).
const RATING_LABEL = {
  significant: "Significant",
  noteworthy: "Noteworthy",
  minor: "Minor",
  routine: "Routine",
};
const RATING_LEGACY = {
  very_interesting: "significant",
  interesting: "noteworthy",
  somewhat: "minor",
  not_interesting: "routine",
};

// ---- formatting -----------------------------------------------------------

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const js = (v) => JSON.stringify(v ?? null).replace(/</g, "\\u003c");

// "Metlen Energy & Metals PLC (MTLN)"    -> "Metlen Energy & Metals PLC"
// "FIRST CITIZENS BANCSHARES INC /DE/"   -> "FIRST CITIZENS BANCSHARES INC"
//
// The SEC appends a state-of-incorporation marker that's pure noise in a
// headline. Casing is deliberately left alone: US filings arrive in caps, but
// title-casing them would mangle AT&T, NVIDIA and every other acronym in the
// set, and there's no better display name stored anywhere (company_stats has a
// description but no name).
const cleanCompany = (c) =>
  String(c ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
    .trim();
// "MTLN.L" -> "MTLN"
const bareTicker = (t) => String(t ?? "").split(".")[0];
const monogram = (t) => bareTicker(t).slice(0, 3).toUpperCase();

function companyLogoUrl(ticker) {
  const domain = TICKER_LOGO_DOMAIN[String(ticker).toUpperCase()];
  const base = domain
    ? `https://img.logo.dev/${domain}`
    : `https://img.logo.dev/ticker/${encodeURIComponent(ticker)}`;

  return `${base}?token=${LOGO_DEV_TOKEN}&size=168&format=png&retina=true`;
}

const SYMBOL = { GBP: "£", USD: "$", EUR: "€" };

/** Full precision with thousands separators — this is a table people read, not
 *  a headline, so £533,353 beats £533k here. */
function money(value, currency = "GBP") {
  const n = Number(value);

  if (!isFinite(n) || n === 0) return "—";

  return `${SYMBOL[currency] ?? ""}${Math.round(n).toLocaleString("en-GB")}`;
}

/** Compact form for the lead sentence and the summary tiles. */
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

const num = (v) => (isFinite(Number(v)) ? Math.round(Number(v)).toLocaleString("en-GB") : "—");

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

/** Role, across both wire shapes: UK carries a single free-text role, US a
 *  flattened checkbox list plus an optional officer title. */
function personRole(deal) {
  if (deal.director?.role) return deal.director.role;
  const r = deal.reporter;

  if (!r) return "";
  if (r.officer_title) return r.officer_title;

  return (r.roles ?? [])
    .map((x) => (x === "ten_percent_owner" ? "10% owner" : x))
    .join(", ");
}

const personName = (deal) => deal.director?.name ?? deal.reporter?.name ?? "—";
const dealValue = (deal, market) => (market === "UK" ? deal.value_gbp : deal.value);

// ---- page sections --------------------------------------------------------

function ratingChip(rating) {
  const norm = RATING_LEGACY[rating] || rating;
  const label = RATING_LABEL[norm];

  if (!label) return "";

  return `<span class="chip ${esc(norm)}">${esc(label)}</span>`;
}

/** The opening paragraph, entirely from real numbers. Deliberately templated
 *  rather than model-written: at ~575 pages the API cost would be real, and
 *  mass-generated prose is the exact pattern search engines demote.
 *
 *  Returns PLAIN TEXT — it's used both as body copy and as the meta
 *  description, so callers escape it once at the point of use. */
function leadParagraph(d) {
  const { market, summary } = d;
  const name = cleanCompany(d.company);
  const people = summary.people;
  const noun = market === "UK" ? (people === 1 ? "director" : "directors") : people === 1 ? "insider" : "insiders";
  const dealNoun = summary.deals === 1 ? "disclosed dealing" : "disclosed dealings";
  const since = summary.first_trade_date ? ` since ${monthYear(summary.first_trade_date, market)}` : "";
  const value = moneyShort(summary.total_value, summary.currency);

  const first = `${people} ${noun} ${people === 1 ? "has" : "have"} bought ${value} of ${name} shares across ${summary.deals} ${dealNoun}${since}.`;
  const analysed = summary.analysed
    ? ` ${summary.analysed} of those ${summary.analysed === 1 ? "has been" : "have been"} scored against our six-point signal check.`
    : "";
  const congress = summary.congress_trades
    ? ` ${summary.congress_trades} congressional ${summary.congress_trades === 1 ? "trade has" : "trades have"} also been disclosed in this ticker.`
    : "";

  return `${first}${analysed}${congress}`;
}

function summaryTiles(d) {
  const { summary, market } = d;
  const tiles = [
    ["Disclosed buys", String(summary.deals)],
    ["Total value", moneyShort(summary.total_value, summary.currency)],
    [market === "UK" ? "Directors" : "Insiders", String(summary.people)],
    ["Most recent", summary.last_trade_date ? fmtDate(summary.last_trade_date, market) : "—"],
  ];

  return `<ul class="tiles">${tiles
    .map(([k, v]) => `<li><span class="tile-v">${esc(v)}</span><span class="tile-k">${esc(k)}</span></li>`)
    .join("")}</ul>`;
}

function dealingsTable(d) {
  const { market, deals } = d;
  const rows = deals
    .map((deal) => {
      const value = money(dealValue(deal, market), market === "UK" ? "GBP" : "USD");
      const role = personRole(deal);
      // UK deals have a public detail route in the SPA; US ones don't yet.
      const name =
        market === "UK" && deal.id
          ? `<a href="https://ddbx.uk/dealings/${esc(deal.id)}">${esc(personName(deal))}</a>`
          : esc(personName(deal));

      return `<tr>
        <td class="nowrap">${esc(fmtDate(deal.trade_date, market))}</td>
        <td>${name}${role ? `<span class="role">${esc(role)}</span>` : ""}</td>
        <td class="numeric">${esc(num(deal.shares))}</td>
        <td class="numeric">${esc(value)}</td>
        <td>${ratingChip(deal.analysis?.rating)}</td>
      </tr>`;
    })
    .join("");

  return `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>${market === "UK" ? "Director" : "Insider"}</th><th class="numeric">Shares</th><th class="numeric">Value</th><th>Rating</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function statsSection(stats) {
  if (!stats) return "";
  const cur = stats.currency ?? "GBP";
  const rows = [
    ["Market cap", stats.marketCap ? moneyShort(stats.marketCap, cur) : null],
    ["P/E ratio", stats.peRatio != null ? Number(stats.peRatio).toFixed(2) : null],
    ["P/B ratio", stats.pbRatio != null ? Number(stats.pbRatio).toFixed(2) : null],
    ["PEG ratio", stats.pegRatio != null ? Number(stats.pegRatio).toFixed(2) : null],
    ["Dividend yield", stats.dividendYield != null ? `${(Number(stats.dividendYield) * 100).toFixed(2)}%` : null],
    ["Beta", stats.beta != null ? Number(stats.beta).toFixed(2) : null],
    ["Previous close", stats.previousClose != null ? `${SYMBOL[cur] ?? ""}${stats.previousClose}` : null],
    ["Open", stats.open != null ? `${SYMBOL[cur] ?? ""}${stats.open}` : null],
  ].filter(([, v]) => v);

  if (!rows.length) return "";

  return `<section>
    <h2>Company stats</h2>
    <dl class="stats">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
  </section>`;
}

function descriptionSection(stats, company) {
  if (!stats?.description) return "";

  return `<section>
    <h2>About ${esc(cleanCompany(company))}</h2>
    <p class="prose">${esc(stats.description)}</p>
  </section>`;
}

function congressSection(gov, market) {
  if (market !== "US" || !gov?.length) return "";
  const rows = gov
    .map(
      (g) => `<tr>
        <td class="nowrap">${esc(fmtDate(g.trade_date, "US"))}</td>
        <td>${esc(g.reporter_name ?? g.reporter?.name ?? "—")}${g.chamber ? `<span class="role">${esc(g.chamber)}</span>` : ""}</td>
        <td>${esc(g.tx_type ?? g.transaction_type ?? "—")}</td>
        <td class="numeric">${esc(g.amount_range ?? g.amount ?? "—")}</td>
      </tr>`,
    )
    .join("");

  return `<section>
    <h2>Congressional trades in this ticker</h2>
    <p class="note">Disclosed under the STOCK Act. Members report a value range, not an exact amount.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Member</th><th>Type</th><th class="numeric">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="more"><a href="https://ddbx.us/congress">See all congressional trading →</a></p>
  </section>`;
}

function newsSection(news) {
  const items = (news?.items ?? []).slice(0, 6);

  if (!items.length) return "";

  return `<section>
    <h2>Recent news</h2>
    <ul class="news">${items
      .map(
        (n) =>
          `<li><a href="${esc(n.url)}" rel="nofollow noopener" target="_blank">${esc(n.title)}</a>${n.source ? `<span class="src">${esc(n.source)}</span>` : ""}</li>`,
      )
      .join("")}</ul>
  </section>`;
}

// ---- document -------------------------------------------------------------

function breadcrumbLd(market, company, url) {
  const host = MARKET_HOST[market];

  return js({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: `${MARKET_LABEL[market]} director dealings`, item: `https://${host}/` },
      { "@type": "ListItem", position: 2, name: cleanCompany(company), item: url },
    ],
  });
}

function page(d, { url, gaId }) {
  const { market } = d;
  const name = cleanCompany(d.company);
  const ticker = bareTicker(d.key);
  const title = `${name} (${ticker}) ${FILING_NOUN[market]} — ${d.summary.deals} insider ${d.summary.deals === 1 ? "buy" : "buys"} · ddbx`;
  const description = leadParagraph(d);
  const image = `https://${MARKET_HOST[market]}/${market === "US" ? "og-us.png" : "og-uk.png"}`;
  const marketHome = market === "US" ? "https://ddbx.us/" : "https://ddbx.uk/";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ddbx">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<script type="application/ld+json">${breadcrumbLd(market, d.company, url)}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(gaId)}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${js(gaId)}, { send_page_view: false });
  gtag('event', 'page_view', {
    page_title: ${js(title)}, page_location: ${js(url)},
    page_type: 'company', market: ${js(market)}, ticker: ${js(ticker)}
  });
</script>
${STYLE}
</head>
<body>
<header class="top">
  <a class="brand" href="${esc(marketHome)}" aria-label="ddbx"><img src="/logo.svg" alt="ddbx" width="73" height="26"></a>
</header>
<main>
  <div class="head">
    <span class="logo"><img src="${esc(companyLogoUrl(d.key))}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="mono">${esc(monogram(d.key))}</span></span>
    <div>
      <h1>${esc(name)} (${esc(ticker)}) ${esc(FILING_NOUN[market])}</h1>
      <p class="lead">${esc(leadParagraph(d))}</p>
    </div>
  </div>
  ${summaryTiles(d)}
  <section>
    <h2>${market === "UK" ? "Director" : "Insider"} buys</h2>
    ${dealingsTable(d)}
    <p class="note">Every ${market === "UK" ? "PDMR disclosure" : "SEC Form 4"} we've surfaced for this issuer. Ratings come from our analysis of the filing, not from the company.</p>
  </section>
  ${descriptionSection(d.stats, d.company)}
  ${statsSection(d.stats)}
  ${congressSection(d.gov, market)}
  ${newsSection(d.news)}
  <section class="cta">
    <h2>Follow ${esc(name)} in the app</h2>
    <p>Get a push the moment a ${market === "UK" ? "director" : "insider"} files, with the analysis attached.</p>
    <a class="btn" href="${esc(marketHome)}download">Get ddbx — 7-day free trial</a>
  </section>
  <nav class="related">
    <a href="${esc(marketHome)}">All ${esc(MARKET_LABEL[market])} ${esc(FILING_NOUN[market])}</a>
    <a href="${esc(marketHome)}companies">Browse every company</a>
    ${market === "UK" ? '<a href="https://ddbx.uk/brokers">Compare UK trading platforms</a>' : '<a href="https://ddbx.us/congress">Congressional trading</a>'}
  </nav>
</main>
<footer>
  <p>ddbx tracks ${esc(MARKET_LABEL[market])} ${esc(FILING_NOUN[market])} and rates each disclosure. Not investment advice.</p>
</footer>
</body>
</html>`;
}

const STYLE = `<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
         background:#f5f0e8; color:#1E1506; -webkit-font-smoothing:antialiased; line-height:1.5; }
  a { color:#6b2f0a; }
  header.top { padding:20px 24px; }
  .brand img { height:26px; width:auto; display:block; }
  main { max-width:760px; margin:0 auto; padding:8px 24px 56px; }
  .head { display:flex; gap:16px; align-items:flex-start; margin:0 0 22px; }
  .logo { width:56px; height:56px; border-radius:999px; flex-shrink:0; display:flex;
          align-items:center; justify-content:center; overflow:hidden;
          background:#f1ebe2; border:1px solid rgba(208,200,190,0.5); }
  .logo img { width:100%; height:100%; object-fit:contain; display:block; }
  .logo .mono { display:none; align-items:center; justify-content:center; width:100%; height:100%;
                font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-weight:600;
                font-size:17px; color:#8a7a62; }
  h1 { font-size:27px; line-height:1.2; letter-spacing:-0.4px; margin:0 0 8px; }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:0.7px; color:#6b5d49; margin:34px 0 12px; }
  .lead { margin:0; color:#5a4d3a; font-size:15.5px; }
  ul.tiles { list-style:none; display:grid; grid-template-columns:repeat(4,1fr); gap:10px; padding:0; margin:0; }
  ul.tiles li { background:#fffaf2; border:1px solid #e4d8c4; border-radius:14px; padding:12px 14px; }
  .tile-v { display:block; font-size:19px; font-weight:700; letter-spacing:-0.3px; }
  .tile-k { display:block; font-size:11.5px; text-transform:uppercase; letter-spacing:0.5px; color:#8a7a62; margin-top:2px; }
  .table-wrap { overflow-x:auto; border:1px solid #e4d8c4; border-radius:14px; background:#fffaf2; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th { text-align:left; font-size:11.5px; text-transform:uppercase; letter-spacing:0.5px;
       color:#8a7a62; padding:11px 14px; border-bottom:1px solid #ece1cf; white-space:nowrap; }
  td { padding:11px 14px; border-bottom:1px solid #f0e7d9; vertical-align:top; }
  tr:last-child td { border-bottom:none; }
  td.numeric, th.numeric { text-align:right; font-variant-numeric:tabular-nums; }
  td.nowrap { white-space:nowrap; }
  .role { display:block; font-size:12px; color:#8a7a62; }
  .chip { display:inline-block; border-radius:999px; padding:3px 9px; font-size:11.5px; font-weight:600; white-space:nowrap; }
  .chip.significant { background:#6b2f0a; color:#fff; }
  .chip.noteworthy { background:transparent; color:#4a3520; border:1px solid #4a3520; }
  .chip.minor { background:rgba(126,118,108,0.14); color:#7e766c; }
  .chip.routine { background:rgba(176,168,152,0.18); color:#9b9078; }
  .note { font-size:12.5px; color:#8a7a62; margin:10px 0 0; }
  .prose { margin:0; color:#4a4034; font-size:14.5px; }
  dl.stats { display:grid; grid-template-columns:repeat(2,1fr); gap:0 24px; margin:0;
             background:#fffaf2; border:1px solid #e4d8c4; border-radius:14px; padding:6px 16px; }
  dl.stats > div { display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid #f0e7d9; }
  dl.stats dt { color:#8a7a62; font-size:13.5px; }
  dl.stats dd { margin:0; font-weight:600; font-size:13.5px; font-variant-numeric:tabular-nums; }
  ul.news { list-style:none; padding:0; margin:0; }
  ul.news li { padding:10px 0; border-bottom:1px solid #ece1cf; font-size:14.5px; }
  ul.news li:last-child { border-bottom:none; }
  .src { display:block; font-size:12px; color:#8a7a62; margin-top:2px; }
  .more { font-size:13.5px; margin:12px 0 0; }
  .cta { background:#fffaf2; border:1px solid #e4d8c4; border-radius:18px; padding:22px; margin-top:34px; }
  .cta h2 { margin-top:0; }
  .cta p { margin:0 0 14px; color:#5a4d3a; font-size:14.5px; }
  a.btn { display:inline-block; background:#1E1506; color:#f5f0e8; text-decoration:none;
          padding:12px 20px; border-radius:12px; font-weight:700; font-size:14.5px; }
  nav.related { display:flex; flex-wrap:wrap; gap:16px; margin:26px 0 0; font-size:14px; }
  footer { border-top:1px solid #e4d8c4; margin-top:20px; padding:20px 24px 40px; }
  footer p { max-width:760px; margin:0 auto; font-size:12.5px; color:#8a7a62; }
  @media (max-width:640px) {
    ul.tiles { grid-template-columns:repeat(2,1fr); }
    dl.stats { grid-template-columns:1fr; }
    h1 { font-size:23px; }
  }
</style>`;

/** No such issuer (or a market we don't publish pages for). noindex so a bad
 *  inbound link can't put an empty URL in the index, and a route back to the
 *  market home rather than a dead end. */
function notFound(market) {
  const home = market === "US" ? "https://ddbx.us/" : "https://ddbx.uk/";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Company not found · ddbx</title>
<meta name="robots" content="noindex, follow">
${STYLE}
</head>
<body>
<main>
  <h1>We don't have dealings for that company</h1>
  <p class="lead">It may not have filed a disclosure we've surfaced yet.</p>
  <nav class="related"><a href="${esc(home)}">Browse the latest director dealings</a></nav>
</main>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const market = String(params.market ?? "").toUpperCase();
  const key = decodeURIComponent(String(params.key ?? ""));
  const reqUrl = new URL(request.url);
  const gaId = gaIdForHost(reqUrl.hostname);

  const htmlHeaders = {
    "content-type": "text/html; charset=utf-8",
    // Half an hour at the CDN matches the API bundle's own TTL; a longer
    // browser cache would hide new filings from someone refreshing the page.
    "cache-control": "public, s-maxage=1800, max-age=300",
  };

  if (!MARKET_HOST[market]) {
    return new Response(notFound(market), { status: 404, headers: htmlHeaders });
  }

  try {
    const res = await fetch(
      `${API_BASE}/company/${market}/${encodeURIComponent(key)}/page`,
      { headers: { accept: "application/json" }, cf: { cacheTtl: 1800, cacheEverything: true } },
    );

    if (!res.ok) {
      return new Response(notFound(market), { status: 404, headers: htmlHeaders });
    }
    const d = await res.json();
    // Canonical always points at the market's own domain and the API's casing
    // of the key, so /company/uk/mtln.l and /company/UK/MTLN.L don't compete.
    const url = `https://${MARKET_HOST[market]}/company/${market}/${encodeURIComponent(d.key)}`;

    return new Response(page(d, { url, gaId }), { headers: htmlHeaders });
  } catch {
    return new Response(notFound(market), { status: 503, headers: htmlHeaders });
  }
}
