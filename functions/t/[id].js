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
// the device. So this serves two audiences: preview crawlers (read the meta)
// and humans without the app (meta-refreshed to the App Store). No User-Agent
// sniffing — crawlers ignore the redirect, humans follow it.

const APP_STORE_URL = "https://apps.apple.com/us/app/ddbx-uk/id6762196330";
const API_BASE = "https://api.ddbx.uk/api";
// Standardised brand strapline. Led onto every shared-link description so any
// ddbx link unfurls with the same claim (mirrors index.html, document-title.tsx
// and the rendered card images in ddbx-data: summary-image.ts `TAGLINE`).
const TAGLINE = "The world's largest insider market intelligence platform";
// Generated 1200×630 card served by the Worker. It internally redirects to the
// company logo / a default image on any failure, so it's always a safe og:image.
const cardImage = (id) => `${API_BASE}/dealings/${encodeURIComponent(id)}/og.png`;

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

function buildMeta(d, id) {
  const director = d.director?.name || "A director";
  const company = cleanCompany(d.company) || "a company";
  const verb = VERBS[d.tx_type] || "traded";
  const amount = money(d.value_gbp, d.currency);
  const title = amount
    ? `${director} ${verb} ${amount} of ${company}`
    : `${director} ${verb} shares in ${company}`;

  const bits = [];
  if (d.director?.role) bits.push(d.director.role);
  if (d.trade_date) bits.push(tradeDate(d.trade_date));
  if (d.analysis?.rating) bits.push(`Rated ${cap(d.analysis.rating)}`);
  bits.push("see the full analysis on ddbx");
  const description = `${TAGLINE}. ${bits.join(" · ")}`;

  return { title, description, ticker: bareTicker(d.ticker) };
}

function page({ title, description, image, url, largeImage, plain }) {
  // `plain` is used by the automated X reply. We keep an image so the unfurl
  // still looks branded, but downgrade to a compact summary card rather than
  // the full-width large-image card used on normal shares.
  const imageMeta = `\n<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="${plain ? "summary" : (largeImage ? "summary_large_image" : "summary")}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">`;
  // Humans get meta-refreshed to the store; crawlers read the OG tags and
  // ignore the refresh. The visible body is the brief flash a human sees.
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
<meta name="apple-itunes-app" content="app-id=6762196330">
<meta http-equiv="refresh" content="2; url=${esc(APP_STORE_URL)}">
<style>
  :root { color-scheme: light dark; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
         background:#f5f0e8; color:#1E1506; display:flex; min-height:100vh;
         align-items:center; justify-content:center; text-align:center; padding:24px; }
  .card { max-width:520px; background:#fffaf2; border:1px solid #d6c7b0; border-radius:20px; padding:24px 22px; box-shadow:0 8px 36px rgba(30,21,6,0.08); }
  .badge { display:inline-flex; border:1px solid #d6c7b0; border-radius:999px; padding:6px 10px; font-size:12px; font-weight:600; letter-spacing:0.6px; text-transform:uppercase; color:#6b5d49; margin:0 0 14px; }
  h1 { font-size:24px; font-weight:700; letter-spacing:-0.3px; margin:0 0 10px; line-height:1.2; }
  p { font-size:15px; color:#6b5d49; margin:0 0 20px; line-height:1.45; }
  .small { font-size:13px; color:#7a6a53; margin-top:14px; }
  .cta { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
  a.btn { display:inline-block; background:#1E1506; color:#f5f0e8; text-decoration:none;
          padding:12px 22px; border-radius:999px; font-weight:600; font-size:15px; }
  a.ghost { background:transparent; color:#1E1506; border:1px solid #bda98a; }
</style>
</head>
<body>
  <div class="card">
    <span class="badge">ddbx app analysis</span>
    <h1>${esc(title)}</h1>
    <p>${esc(description)}</p>
    <div class="cta">
      <a class="btn" href="${esc(APP_STORE_URL)}">Open in iOS app</a>
      <a class="btn ghost" href="https://ddbx.uk">Continue on web</a>
    </div>
    <p class="small">Redirecting to the App Store…</p>
  </div>
</body>
</html>`;
}

// Minimal fallback: keep the site's default OG, still send humans to the store.
function fallback(url) {
  return page({
    title: "ddbx · Director Dealings",
    description: `${TAGLINE}. Track director and insider share dealings. See the analysis on ddbx.`,
    image: "https://ddbx.uk/apple-icon-180x180.png",
    url,
    largeImage: false,
  });
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const id = params.id;
  const url = `https://ddbx.uk/t/${id}`;
  // `?card=plain` → compact X card (keeps branded image, avoids full-width card).
  const plain = new URL(request.url).searchParams.get("card") === "plain";
  const headers = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, s-maxage=3600, max-age=600",
  };

  try {
    const res = await fetch(`${API_BASE}/dealings/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) return new Response(fallback(url), { headers });
    const d = await res.json();
    const meta = buildMeta(d, id);
    // Generated 1200×630 card (Worker route). The card endpoint itself redirects
    // to the company logo / default image on any failure, so this is always safe.
    const image = cardImage(id);
    return new Response(
      page({ title: meta.title, description: meta.description, image, url, largeImage: true, plain }),
      { headers }
    );
  } catch {
    return new Response(fallback(url), { headers });
  }
}
