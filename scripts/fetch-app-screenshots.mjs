#!/usr/bin/env node
// Refresh src/data/broker-app-screenshots.json — per-broker iPhone screenshots
// lifted from each platform's public App Store page.
//
// Apple's iTunes search API reliably returns the app id (trackId) but no
// longer populates screenshotUrls for apps on the current store page format,
// so we resolve the id via the API and then parse the store web page, whose
// markup carries every screenshot as an mzstatic srcset. URLs are size
// templates (…/{w}x{h}bb.webp) hosted on Apple's CDN and stable enough to
// bake in; re-run this script to refresh.
//
//   node scripts/fetch-app-screenshots.mjs
//
// Ambiguous name→app matches are pinned in APP_OVERRIDES below; anything
// resolved by bare search is printed for eyeballing before you commit.

const API_BASE = process.env.VITE_API_BASE || "https://api.ddbx.uk";
const OUT = new URL("../src/data/broker-app-screenshots.json", import.meta.url);
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const MAX_SHOTS = 6;

// slug → App Store numeric id, for names too generic to trust a search on
// (IG, Plum…) or where the investing product lives inside a differently-named
// app. null = provider has no UK retail app worth showing; skip it.
const APP_OVERRIDES = {
  freetrade: 1354479011, // Freetrade: Trade & Invest
  "trading-212": 566325832, // Trading 212
  investengine: 1394442225, // InvestEngine: ETF Investing
  lightyear: 1562105616, // Lightyear: Invest in stocks
  moneybox: 1049797239, // Moneybox - Save and Invest
  plum: 1456139507, // Plum: Smart Saving & Investing
  "revolut-invest": 932493382, // Revolut — invest lives in the main app
  "hargreaves-lansdown": 450465506, // Hargreaves Lansdown
  "aj-bell": 557882383, // AJ Bell: ISA & SIPP investing
  "interactive-investor": 434714838, // interactive investor (ii)
  "vanguard-uk": 6476108034, // Vanguard UK
  "fidelity-uk": 1462211125, // Fidelity - Manage Investments (UK)
  "charles-stanley-direct": 1297304657, // Charles Stanley Direct
  etoro: 674984916, // etoro: Trade & Invest
  // The investing/ISA app, not the leveraged "IG: Trading" platform (406492428).
  ig: 6702015912, // IG Invest: Stocks. ISA. Crypto
  xtb: 949905889, // XTB Online Investing
  saxo: 486341512, // SaxoTrader | Trade + Invest
  // Nutmeg rebranded under J.P. Morgan — this is the renamed Nutmeg app.
  nutmeg: 1127250193, // J.P. Morgan Personal Investing
  wealthify: 1204332482, // Wealthify: Managed Investments
};

const search = async (term) => {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&country=gb&limit=5`,
    { headers: { "user-agent": UA } },
  );
  const { results = [] } = await res.json();

  return results;
};

const lookup = async (id) => {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${id}&country=gb`,
    { headers: { "user-agent": UA } },
  );
  const { results = [] } = await res.json();

  return results[0] ?? null;
};

/** Pull iPhone screenshot base URLs (….png/) from the store page's srcsets,
 *  in display order, deduped. We keep the base and let the client pick a
 *  size (e.g. 600x1300bb.webp). */
const scrapeScreenshots = async (trackViewUrl) => {
  const res = await fetch(trackViewUrl, { headers: { "user-agent": UA } });
  const html = await res.text();
  // Screenshot srcsets use tall phone renditions like /300x650bb.webp; icon
  // and misc artwork use square-ish sizes, so the shape filters for us.
  const re =
    /https:\/\/is\d+-ssl\.mzstatic\.com\/image\/thumb\/[^" ]+?\/(\d+)x(\d+)bb\.webp/g;
  const seen = new Set();
  const bases = [];

  for (const m of html.matchAll(re)) {
    const [url, w, h] = [m[0], Number(m[1]), Number(m[2])];

    if (h / w < 1.8) continue; // not a portrait phone screenshot
    const base = url.replace(/\/\d+x\d+bb\.webp$/, "");

    if (seen.has(base)) continue;
    seen.add(base);
    bases.push(base);
    if (bases.length >= MAX_SHOTS) break;
  }

  return bases;
};

const brokersRes = await fetch(`${API_BASE}/api/brokers`);
const { brokers } = await brokersRes.json();
const out = {};

for (const b of brokers) {
  let app = null;

  if (b.slug in APP_OVERRIDES) {
    const id = APP_OVERRIDES[b.slug];

    if (id == null) continue;
    app = await lookup(id);
  } else {
    const candidates = await search(b.name);

    app = candidates[0] ?? null;
    if (app) {
      console.log(
        `? ${b.slug}: matched "${app.trackName}" (${app.trackId}) by ${app.sellerName} — verify`,
      );
    }
  }

  if (!app) {
    console.log(`✗ ${b.slug}: no app found`);
    continue;
  }

  const screenshots = await scrapeScreenshots(app.trackViewUrl);

  if (!screenshots.length) {
    console.log(`✗ ${b.slug}: page had no phone screenshots`);
    continue;
  }

  out[b.slug] = {
    appId: app.trackId,
    appName: app.trackName,
    appUrl: app.trackViewUrl.split("?")[0],
    screenshots,
  };
  console.log(`✓ ${b.slug}: ${screenshots.length} screenshots`);
  await new Promise((r) => setTimeout(r, 400));
}

const { writeFile, mkdir } = await import("node:fs/promises");

await mkdir(new URL(".", OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`\nWrote ${Object.keys(out).length} entries to ${OUT.pathname}`);
