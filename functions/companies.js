// The company index: ddbx.uk/companies, ddbx.us/companies.
//
// Without this the ~575 company pages would be orphans — listed in the sitemap
// but linked from nowhere, which is a weak signal and a slow crawl. This is the
// hub: one page linking every company page on the host, so crawlers reach them
// by following links like they do everything else, and readers get a browsable
// A-Z.
//
// Same content bar as the sitemap (see BAR below) so the two agree: a company
// that isn't worth submitting isn't worth linking from the hub either.

const API_BASE = "https://api.ddbx.uk/api";

const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };
const FILING_NOUN = { UK: "director dealings", US: "insider trading" };
const MARKET_LABEL = { UK: "UK", US: "US" };

/** Mirrors meetsContentBar in functions/sitemap.xml.js. */
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

// Mirrors cleanCompany in functions/company/[market]/[key].js.
const cleanCompany = (c) =>
  String(c ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
    .trim();

const bareTicker = (t) => String(t ?? "").split(".")[0];

/** First character to group under: A–Z, everything else under #. */
function initial(name) {
  const ch = String(name).trim().charAt(0).toUpperCase();

  return ch >= "A" && ch <= "Z" ? ch : "#";
}

const STYLE = `<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
         background:#f5f0e8; color:#1E1506; -webkit-font-smoothing:antialiased; line-height:1.5; }
  a { color:#6b2f0a; }
  header.top { padding:20px 24px; }
  .brand img { height:26px; width:auto; display:block; }
  main { max-width:860px; margin:0 auto; padding:8px 24px 56px; }
  h1 { font-size:27px; line-height:1.2; letter-spacing:-0.4px; margin:0 0 8px; }
  .lead { margin:0 0 20px; color:#5a4d3a; font-size:15.5px; }
  .jump { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 26px; padding:0; list-style:none; }
  .jump a { display:inline-block; min-width:30px; text-align:center; padding:5px 8px; font-size:13px;
            font-weight:600; text-decoration:none; background:#fffaf2; border:1px solid #e4d8c4; border-radius:9px; }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:0.7px; color:#6b5d49;
       margin:26px 0 10px; scroll-margin-top:16px; }
  ul.cos { list-style:none; padding:0; margin:0; columns:2; column-gap:28px; }
  ul.cos li { break-inside:avoid; padding:6px 0; font-size:14.5px; }
  ul.cos .tk { color:#8a7a62; font-size:12.5px; font-variant-numeric:tabular-nums; }
  ul.cos .n { color:#a8997f; font-size:12px; }
  footer { border-top:1px solid #e4d8c4; margin-top:26px; padding:20px 24px 40px; }
  footer p { max-width:860px; margin:0 auto; font-size:12.5px; color:#8a7a62; }
  @media (max-width:640px) { ul.cos { columns:1; } h1 { font-size:23px; } }
</style>`;

function page(market, host, companies) {
  const noun = FILING_NOUN[market];
  const label = MARKET_LABEL[market];
  const title = `Every ${label} company with ${noun} — ${companies.length} issuers · ddbx`;
  const description = `Browse ${companies.length} ${label} companies whose ${market === "UK" ? "directors" : "insiders"} have bought shares, with the filings, ratings and company stats for each.`;
  const url = `https://${host}/companies`;

  const groups = new Map();

  for (const c of companies) {
    const g = initial(cleanCompany(c.company) || c.key);

    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(c);
  }
  const letters = [...groups.keys()].sort();

  const sections = letters
    .map((letter) => {
      const items = groups
        .get(letter)
        .sort((a, b) => cleanCompany(a.company).localeCompare(cleanCompany(b.company)))
        .map(
          (c) =>
            `<li><a href="/company/${esc(market)}/${encodeURIComponent(c.key)}">${esc(cleanCompany(c.company) || c.key)}</a> <span class="tk">${esc(bareTicker(c.key))}</span> <span class="n">· ${c.deals} ${c.deals === 1 ? "buy" : "buys"}</span></li>`,
        )
        .join("");

      return `<h2 id="${esc(letter === "#" ? "num" : letter)}">${esc(letter)}</h2><ul class="cos">${items}</ul>`;
    })
    .join("");

  const jump = letters
    .map((l) => `<li><a href="#${esc(l === "#" ? "num" : l)}">${esc(l)}</a></li>`)
    .join("");

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
<meta property="og:image" content="https://${esc(host)}/${market === "US" ? "og-us.png" : "og-uk.png"}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
${STYLE}
</head>
<body>
<header class="top">
  <a class="brand" href="/" aria-label="ddbx"><img src="/logo.svg" alt="ddbx" width="73" height="26"></a>
</header>
<main>
  <h1>Every ${esc(label)} company with ${esc(noun)}</h1>
  <p class="lead">${esc(description)}</p>
  <ul class="jump">${jump}</ul>
  ${sections}
</main>
<footer>
  <p>Companies appear here once they have repeat insider activity or a written analysis on file. Not investment advice.</p>
</footer>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);
  const market = MARKET_BY_HOST[host];
  const headers = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, s-maxage=3600, max-age=600",
  };

  // ddbx.eu has no company pages yet — send the SPA's 404 rather than an empty
  // index. (Pages will fall through to index.html for unknown routes.)
  if (!market) return context.next();

  try {
    const res = await fetch(`${API_BASE}/companies?market=${market}`, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });

    if (!res.ok) return context.next();
    const body = await res.json();
    const companies = (body.companies ?? []).filter((c) => c.key && meetsContentBar(c));

    return new Response(page(market, host, companies), { headers });
  } catch {
    return context.next();
  }
}
