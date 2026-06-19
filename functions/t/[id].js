// Cloudflare Pages Function for shared-trade links: ddbx.uk/t/{id}
//
// Why this exists: the site is a client-rendered SPA, so link-preview crawlers
// (iMessage, WhatsApp, Slack, Twitter) only ever see the static index.html meta.
// This Function server-renders per-trade Open Graph tags so a shared trade
// unfurls into a real card. See
// ddbx-ios-app/investigations/2026-06-07-share-trade-deep-link.md.
//
// Users who HAVE the app never reach this — iOS intercepts the Universal Link
// (AASA at /.well-known/apple-app-site-association) before the request leaves
// the device. So this serves two audiences:
//   1. preview crawlers — read the OG/Twitter meta to unfurl the card;
//   2. humans WITHOUT the app — the people we most want to convert.
//
// For (2) the page is a conversion funnel, NOT a redirect. It used to meta-refresh
// straight to the App Store, which dumped a warm lead onto a cold store page
// before they saw why they should care. Instead we surface the deal, the rating,
// and the 6-point signal check that drives it, then offer the 7-day free trial.
// Crawlers ignore the body and just read the meta.

const APP_STORE_URL = "https://apps.apple.com/us/app/ddbx-uk/id6762196330";
const API_BASE = "https://api.ddbx.uk/api";
// Share links unfurl with the clean per-market ddbx wordmark — the same OG art
// the rest of the site uses (see functions/_middleware.js): light on UK/EU, dark
// on US. We deliberately DON'T use the Worker's dynamic per-trade card here: the
// tweet/iMessage text already carries the deal detail, so the image stays pure
// brand. Same-origin so it resolves on whichever domain served the page.
const wordmarkImage = (origin, host) =>
  `${origin}/${String(host).toLowerCase().endsWith("ddbx.us") ? "og-us.png" : "og-uk.png"}`;

// Company logo via Logo.dev (mirrors src/components/company-logo.tsx + the iOS
// app + the worker card kit). Same publishable token they all ship — safe in
// the client per Logo.dev docs. Free tier requires the attribution link below.
const LOGO_DEV_TOKEN = "pk_aFXx8Wx5TrenY0XbJuUMrA";
// Logo.dev's TICKER lookup mis-resolves a few dual-class symbols; fetch by the
// real domain instead. Mirrors company-logo.tsx's TICKER_LOGO_DOMAIN.
const TICKER_LOGO_DOMAIN = {
  "BRK.B": "berkshirehathaway.com",
  "BRK.A": "berkshirehathaway.com",
};
// Keep the LSE `.L` suffix — Logo.dev is keyed on exchange-qualified symbols for
// UK rows; stripping it returns placeholders or the wrong company. Matches iOS.
function companyLogoUrl(ticker) {
  const domain = TICKER_LOGO_DOMAIN[String(ticker).toUpperCase()];
  const base = domain
    ? `https://img.logo.dev/${domain}`
    : `https://img.logo.dev/ticker/${encodeURIComponent(ticker)}`;
  return `${base}?token=${LOGO_DEV_TOKEN}&size=168&format=png&retina=true`;
}
// "CKN.L" -> "CKN" — the monogram shown when the logo image fails to load.
const monogram = (ticker) => String(ticker ?? "").replace(/\.L$/i, "").slice(0, 3).toUpperCase();

// ---- Analytics (GA4) ------------------------------------------------------
// This page is standalone server-rendered HTML — it never boots the SPA, so the
// site's gtag (src/lib/cookie-consent.ts) never loads here. We inject GA4
// inline so the cold-traffic funnel is measurable: a page_view on load plus a
// click event on each CTA. Per-domain measurement IDs mirror the SPA's GA_IDS;
// GA loads unconditionally to match the site's posture (the banner there gates
// only the X pixel, not GA).
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

// Safe-embed a value inside a <script> — JSON, with `<` escaped so a stray
// "</script>" in a company/director name can't break out of the tag.
const js = (v) => JSON.stringify(v ?? null).replace(/</g, "\\u003c");

// gtag bootstrap + page_view (deal id / ticker / rating as params) and a global
// ddbxCta() the CTAs call onclick. transport beacon so the event still sends
// when the App Store click navigates the page away.
function analyticsHead(gaId, { dealId, ticker, rating, title, url }) {
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(gaId)}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${js(gaId)}, { send_page_view: false });
  gtag('event', 'page_view', {
    page_title: ${js(title)}, page_location: ${js(url)},
    page_type: 'share_funnel', deal_id: ${js(dealId)},
    ticker: ${js(ticker)}, rating: ${js(rating)}
  });
  function ddbxCta(name){
    gtag('event', name, { transport_type: 'beacon', deal_id: ${js(dealId)}, ticker: ${js(ticker)}, rating: ${js(rating)} });
  }
</script>`;
}

// The six checks behind a rating, in display order. Labels mirror the site's
// CHECKLIST_LABELS (src/components/rating-checklist-view.tsx) and the X reply
// (ddbx-data: social-tweet-copy.ts) so the funnel matches the full analysis.
const CHECKS = [
  ["open_market_buy", "Open-market buy"],
  ["senior_insider", "Senior insider"],
  ["meaningful_conviction", "Meaningful conviction"],
  ["no_alternative_explanation", "No scheme or plan"],
  ["supporting_context_found", "Supporting context found"],
  ["no_major_counter_signal", "No major counter-signal"],
];

// Rating display + legacy aliases (mirrors src/components/rating-badge.tsx).
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

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// "Staffline Group (STAF)" -> "Staffline Group"
const cleanCompany = (c) => String(c ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim();
// "STAF.L" -> "STAF"
const bareTicker = (t) => String(t ?? "").split(".")[0];

// Mirrors the worker's fmtGbp (worker/pipeline/summary-image.ts) so the headline
// in the unfurl text matches the value on the generated card image (e.g. £29k).
function money(value, currency) {
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return null;
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${sym}${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}k`;
  return `${sym}${Math.round(n)}`;
}

function tradeDate(iso) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const VERBS = { buy: "bought", sell: "sold" };
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Keep the on-page summary tight — the analysis summary is "tweet-ready" but can
// run to a couple of sentences; clamp so the funnel never gets wordy.
function clamp(s, max = 200) {
  const t = String(s ?? "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function buildMeta(d, id) {
  const director = d.director?.name || "A director";
  const company = cleanCompany(d.company) || "a company";
  const verb = VERBS[d.tx_type] || "traded";
  const amount = money(d.value_gbp, d.currency);
  const title = amount
    ? `${director} ${verb} ${amount} of ${company}`
    : `${director} ${verb} shares in ${company}`;

  const rating = d.analysis?.rating || null;
  const bits = [];
  if (d.director?.role) bits.push(d.director.role);
  if (d.trade_date) bits.push(tradeDate(d.trade_date));
  if (rating) bits.push(`Rated ${cap(rating)}`);
  bits.push("see the full analysis on ddbx");
  const description = bits.join(" · ");

  return {
    title,
    description,
    ticker: bareTicker(d.ticker),
    // Structured fields the visible funnel renders from.
    funnel: {
      title,
      ticker: d.ticker || null,
      role: d.director?.role || null,
      dateStr: d.trade_date ? tradeDate(d.trade_date) : null,
      rating,
      summary: d.analysis?.summary ? clamp(d.analysis.summary) : null,
      checklist: d.analysis?.checklist || null,
    },
  };
}

// ---- Visible body (humans without the app) -------------------------------

const LOGO = `<a class="brand" href="https://ddbx.uk" aria-label="ddbx"><img src="/logo.svg" alt="ddbx" width="73" height="26"></a>`;

// Circular company logo with a monogram fallback. No JS state available here, so
// the <img> swaps itself for the monogram via inline onerror.
function companyLogoHtml(ticker) {
  if (!ticker) return "";
  return `<span class="logo"><img src="${esc(companyLogoUrl(ticker))}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="mono">${esc(monogram(ticker))}</span></span>`;
}

// Logo.dev free tier requires a followable link back, once per logo-bearing page.
const ATTRIBUTION = `<p class="attribution">Logos by <a href="https://logo.dev" rel="noopener noreferrer" target="_blank">Logo.dev</a></p>`;

function ratingHtml(rating) {
  const norm = RATING_LEGACY[rating] || rating;
  const label = RATING_LABEL[norm];
  if (!label) return "";
  const tick = norm === "significant" || norm === "noteworthy" ? "✓ " : "";
  return `<span class="rating ${esc(norm)}">${tick}Rated ${esc(label)}</span>`;
}

function checksHtml(checklist) {
  const passed = CHECKS.filter(([k]) => checklist[k]).length;
  const items = CHECKS.map(([k, label]) => {
    const ok = !!checklist[k];
    return `<li class="${ok ? "" : "fail"}"><span class="mark ${ok ? "yes" : "no"}">${ok ? "✓" : "✗"}</span><span class="label">${esc(label)}</span></li>`;
  }).join("");
  return `<div class="checks-head"><span class="checks-title">6-point signal check</span><span class="checks-count">${passed} of ${CHECKS.length} met</span></div><ul class="checks">${items}</ul>`;
}

const CTA = `<div class="cta">
      <a class="btn primary" href="${esc(APP_STORE_URL)}" onclick="ddbxCta('cta_app_store')">Read the full analysis on iOS<span class="sub">7-day free trial · cancel anytime</span></a>
      <a class="btn ghost" href="https://ddbx.uk" onclick="ddbxCta('cta_web')">Continue on the web</a>
    </div>`;

function bodyHtml(f) {
  if (!f || !f.title) {
    // No per-deal data — generic brand hero, still funnels to the trial.
    return `<div class="card">
    ${LOGO}
    <h1>Director &amp; insider dealings, rated and analysed</h1>
    <p class="summary">Every disclosure scored against a 6-point signal check, with the full thesis, evidence and price history in the app.</p>
    ${CTA}
  </div>`;
  }
  const metaBits = [f.role, f.dateStr].filter(Boolean).map(esc).join(" · ");
  return `<div class="card">
    ${LOGO}
    ${companyLogoHtml(f.ticker)}
    ${ratingHtml(f.rating)}
    <h1>${esc(f.title)}</h1>
    ${metaBits ? `<p class="meta">${metaBits}</p>` : ""}
    ${f.summary ? `<p class="summary">${esc(f.summary)}</p>` : ""}
    ${f.checklist ? checksHtml(f.checklist) : ""}
    <p class="unlock">Full thesis, supporting evidence &amp; price history — in the app.</p>
    ${CTA}
    ${f.ticker ? ATTRIBUTION : ""}
  </div>`;
}

function page({ title, description, image, url, funnel, gaId, dealId }) {
  // The unfurl is the clean per-market ddbx wordmark, so we always serve the
  // full-width large-image card — there's no longer a second detail card to
  // avoid (the old `?card=plain` downgrade existed for the per-trade card).
  const imageMeta = `\n<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">`;
  const analytics = gaId
    ? "\n" + analyticsHead(gaId, {
        dealId: dealId || null,
        ticker: funnel?.ticker || null,
        rating: funnel?.rating || null,
        title,
        url,
      })
    : "";
  // Crawlers read the OG tags; humans see the funnel body and tap through. No
  // auto-redirect — converting a lead means letting them read first.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ddbx">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">${imageMeta}
<meta name="apple-itunes-app" content="app-id=6762196330">${analytics}
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
         background:#f5f0e8; color:#1E1506; display:flex; min-height:100vh;
         align-items:center; justify-content:center; padding:24px; -webkit-font-smoothing:antialiased; }
  .card { width:100%; max-width:460px; background:#fffaf2; border:1px solid #e4d8c4;
          border-radius:24px; padding:30px 26px 26px; box-shadow:0 12px 48px rgba(30,21,6,0.10); }
  .brand { display:flex; align-items:center; justify-content:center; margin:0 0 20px; }
  .brand img { height:26px; width:auto; display:block; }
  .logo { width:56px; height:56px; border-radius:999px; margin:0 auto 14px; display:flex;
          align-items:center; justify-content:center; overflow:hidden;
          background:#f1ebe2; border:1px solid rgba(208,200,190,0.5); }
  .logo img { width:100%; height:100%; object-fit:contain; display:block; }
  .logo .mono { display:none; align-items:center; justify-content:center; width:100%; height:100%;
                font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-weight:600;
                font-size:17px; color:#8a7a62; line-height:1; }
  .rating { display:inline-flex; align-items:center; border-radius:999px; padding:5px 12px;
            font-size:12px; font-weight:600; letter-spacing:0.3px; margin:0 0 4px; }
  .rating.significant { background:#6b2f0a; color:#fff; }
  .rating.noteworthy  { background:transparent; color:#4a3520; border:1px solid #4a3520; }
  .rating.minor       { background:rgba(126,118,108,0.14); color:#7e766c; }
  .rating.routine     { background:rgba(176,168,152,0.18); color:#9b9078; }
  h1 { font-size:23px; line-height:1.22; font-weight:700; letter-spacing:-0.3px; margin:12px 0 8px; }
  .meta { font-size:13px; color:#8a7a62; margin:0 0 16px; line-height:1.4; }
  .summary { font-size:14.5px; color:#5a4d3a; line-height:1.5; margin:0 0 20px; }
  .checks-head { display:flex; align-items:baseline; justify-content:space-between; margin:0 0 10px; }
  .checks-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#6b5d49; }
  .checks-count { font-size:12px; color:#8a7a62; font-weight:600; }
  ul.checks { list-style:none; margin:0 0 18px; padding:14px 0; display:grid; gap:9px;
              border-top:1px solid #ece1cf; border-bottom:1px solid #ece1cf; }
  ul.checks li { display:flex; align-items:center; gap:10px; font-size:14px; color:#2a2010; }
  ul.checks li.fail .label { color:rgba(30,21,6,0.5); }
  .mark { width:20px; height:20px; border-radius:999px; display:inline-flex; align-items:center;
          justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
  .mark.yes { background:rgba(30,107,24,0.12); color:#1e6b18; }
  .mark.no  { background:rgba(139,32,32,0.12); color:#8b2020; }
  .unlock { font-size:13px; color:#8a7a62; text-align:center; margin:0 0 14px; line-height:1.4; }
  .cta { display:flex; flex-direction:column; gap:10px; }
  a.btn { display:flex; flex-direction:column; align-items:center; justify-content:center;
          text-decoration:none; padding:14px 20px; border-radius:14px; font-weight:700; font-size:15px; line-height:1.15; }
  a.primary { background:#1E1506; color:#f5f0e8; gap:3px; }
  a.primary .sub { font-size:12px; font-weight:500; opacity:0.72; letter-spacing:0.2px; }
  a.ghost { background:transparent; color:#1E1506; border:1px solid #d6c7b0; }
  .tagline { text-align:center; font-size:11.5px; color:#a8997f; margin:18px 0 0; letter-spacing:0.2px; line-height:1.4; }
  .attribution { text-align:center; font-size:10.5px; color:#b5a78d; margin:8px 0 0; }
  .attribution a { color:#9b8a6e; text-decoration:none; }
</style>
</head>
<body>
  ${bodyHtml(funnel)}
</body>
</html>`;
}

// Minimal fallback: keep the site's default OG, still funnel humans to the trial.
function fallback(url, gaId, dealId, origin, host) {
  return page({
    title: "ddbx · Director Dealings",
    description: `Track director and insider share dealings. See the analysis on ddbx.`,
    image: wordmarkImage(origin, host),
    url,
    funnel: null,
    gaId,
    dealId,
  });
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const id = params.id;
  const reqUrl = new URL(request.url);
  const url = `https://ddbx.uk/t/${id}`;
  // GA4 measurement ID by the host actually serving the page (uk/us/eu).
  const gaId = gaIdForHost(reqUrl.hostname);
  const headers = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, s-maxage=3600, max-age=600",
  };

  try {
    const res = await fetch(`${API_BASE}/dealings/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) return new Response(fallback(url, gaId, id, reqUrl.origin, reqUrl.hostname), { headers });
    const d = await res.json();
    const meta = buildMeta(d, id);
    // Clean per-market ddbx wordmark (light UK/EU, dark US) — not the per-trade card.
    const image = wordmarkImage(reqUrl.origin, reqUrl.hostname);
    return new Response(
      page({ title: meta.title, description: meta.description, image, url, funnel: meta.funnel, gaId, dealId: id }),
      { headers }
    );
  } catch {
    return new Response(fallback(url, gaId, id, reqUrl.origin, reqUrl.hostname), { headers });
  }
}
