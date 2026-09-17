// Crawler pre-render for the global tape: ddbx.uk/tape (canonical), served
// on every host and folded onto ddbx.uk like /developers and /mcp.
//
// The rows come from shared/tape.js, the same module the React page reads,
// so the crawled order is the hydrated order. What the crawler cannot have is
// the live state: the open/closed flags and the local clocks are a function
// of the minute the page is read, and a cached copy would state a Tuesday
// afternoon on a Sunday. So this prints the SESSION HOURS per market, which
// are facts, and leaves the clocks to hydration. The parity rule holds: every
// figure below is visible text on the hydrated page.
//
// Five upstream fetches, each on its own fate (fetchTapeFeeds never throws
// for one market). Every feed failing means we could not find out, so the
// plain shell is served and the next crawl re-reads; every feed answering
// with nothing would be a first, and that case is noindexed like an empty
// board.
//
// This route is on the middleware's skip list, so this Function owns the
// entire <head>.

import {
  fetchTapeFeeds,
  formatDayLong,
  formatDayShort,
  formatGbpApprox,
  formatNative,
  formatSessionHours,
  mergeTape,
  joinMarketNames,
  rowClock,
  tapeCoverageNow,
  tapeMarket,
  tapeMarketStates,
  tapeRowHref,
  tapeSummary,
  TAPE_MARKETS,
  TAPE_METHODOLOGY,
} from "../shared/tape.js";
import { apexHost, esc, noindex, page, renderInto } from "../shared/prerender.js";
import { brandTitle, isProductionHost } from "../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
const CANONICAL = "https://ddbx.uk/tape";

/** Rows the crawler gets. Two days of five markets, roughly; the hydrated
 *  page draws the whole span and offers the rest on a press. */
const ROWS = 80;

const RATING_LABEL = {
  significant: "Significant",
  noteworthy: "Noteworthy",
  minor: "Minor",
  routine: "Routine",
};

function verdict(row) {
  switch (row.ratingState) {
    case "rated":
      return RATING_LABEL[row.rating] ?? row.rating;
    case "skipped":
      return "Skipped";
    case "reviewing":
      return "In review";
    case "no-layer":
      return "Unrated market";
    default:
      return "Not yet rated";
  }
}

/** The count with its per-market parts (so a round total cannot read as a
 *  cap), any quiet market with the date of its last filing, then the newest
 *  row. `rows` is the whole merged tape, not the 80 the table prints. */
function leadSentence(rows, floor, states) {
  const summary = tapeSummary(rows, states, floor);
  const top = rows[0];

  if (!top) return summary;
  const m = tapeMarket(top.market);
  const size = formatNative(top.value, top.currency);
  // "who bought £99k" reads; "who exercise SEK 2k" does not. A grant or an
  // exercise leads without a size clause.
  const verb = top.side === "buy" ? "bought" : top.side === "sell" ? "sold" : null;

  return `${summary} Newest: ${top.insider.name}${top.insider.role ? `, ${top.insider.role}` : ""} at ${top.company} in ${m.name}${verb && size ? `, who ${verb} ${size}` : ""}.`;
}

function prerender(rows, allRows, floor, binding, failed, states, host) {
  const cell = "padding:8px 12px;border-bottom:1px solid #ece1cf;vertical-align:top";
  const quiet = "display:block;font-size:12px;color:#6b6154;margin-top:2px";
  const eyebrow =
    "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";

  let lastDay = null;
  const body = rows
    .map((r) => {
      const m = tapeMarket(r.market);
      const clock = rowClock(r);
      const size = formatNative(r.value, r.currency);
      const approx = formatGbpApprox(r.gbp);
      const dayRule =
        r.disclosedDate !== lastDay
          ? `<tr><th colspan="6" style="text-align:left;padding:18px 12px 6px;font-size:14px;border-bottom:1px solid #ece1cf">${esc(formatDayLong(r.disclosedDate))}</th></tr>`
          : "";

      lastDay = r.disclosedDate;
      // Always absolute here, and on the market's own domain: a crawler that
      // follows a US row from ddbx.uk should land on ddbx.us, where the filing
      // is canonical, not on the noindexed copy ddbx.uk would serve.
      const to = tapeRowHref(r, host);
      const href = to && to.startsWith("/") ? `https://${host}${to}` : to;
      const subject = href
        ? `<a href="${esc(href)}">${esc(r.company)}</a>`
        : esc(r.company);

      return `${dayRule}<tr>
      <td style="${cell}">${esc(clock ?? "date only")}</td>
      <td style="${cell}">${esc(m.name)}</td>
      <td style="${cell}">${subject}${r.ticker ? ` <span style="font-family:ui-monospace,monospace;font-size:11px;color:#6b6154">${esc(r.ticker)}</span>` : ""}<span style="${quiet}">${esc(r.insider.name)}${r.insider.role ? `, ${esc(r.insider.role)}` : ""}${r.flags.length ? ` · ${esc(r.flags.join(" · "))}` : ""}</span></td>
      <td style="${cell}">${esc(r.action)}</td>
      <td style="${cell}">${size ? esc(size) : "not filed"}${approx ? `<span style="${quiet}">${esc(approx)}</span>` : ""}</td>
      <td style="${cell}">${esc(verdict(r))}</td>
    </tr>`;
    })
    .join("");

  const coverage = TAPE_MARKETS.map(
    (m, i) => `<li style="margin-bottom:14px"><strong>${esc(m.name)}</strong> · ${esc(m.city)} · ${esc(formatSessionHours(m))} local · ${esc(m.currency)}<br>
      <span style="color:#4a4034">Right now: ${esc(tapeCoverageNow(states[i], floor))}. Source: ${esc(m.source)}. Who files: ${esc(m.filers)}. On the tape: ${esc(m.included)}. Timing: ${esc(m.cadence)}. Verdicts: ${
        m.ratings === "layer"
          ? "rated where the analysis layer has reached the filing; the rest are shown unrated."
          : "none yet; every row is marked as an unrated market, not an unrated filing."
      }</span></li>`,
  ).join("");

  const method = TAPE_METHODOLOGY.map(
    (line) => `<li style="margin-bottom:8px">${esc(line)}</li>`,
  ).join("");

  const list = joinMarketNames;

  return page(`<p style="${eyebrow}">Global tape</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">Five markets, one tape</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">Insider filings from Seoul to New York, merged into one list and ordered by when each was disclosed. Sweden and the Netherlands show every notification; the UK, US and Korea show purchases only, the US and Korea above a size floor. Korea files while London sleeps, and a product that reads five markets sees a day a single-market product misses.</p>
  ${floor ? `<p style="font-size:13px;color:#6b6154;max-width:62ch">The tape holds every filing from ${esc(formatDayShort(floor))}: the span each market’s feed covers in full, set by ${esc(list(binding))}.</p>` : ""}
  ${failed.length ? `<p style="font-size:13px;color:#6b6154;max-width:62ch">The ${esc(list(failed))} ${failed.length === 1 ? "feed" : "feeds"} did not load when this page was rendered, so ${esc(list(failed))} ${failed.length === 1 ? "is" : "are"} missing from the list below. That is a network problem, not a quiet market.</p>` : ""}
  <h2 style="font-size:15px;margin:28px 0 10px">Five exchanges</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:72ch;padding-left:18px">${TAPE_MARKETS.map((m) => `<li>${esc(m.city)} trades ${esc(formatSessionHours(m))} local time</li>`).join("")}</ul>
  <p style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${esc(tapeSummary(allRows, states, floor))}${allRows.length > rows.length ? ` The newest ${rows.length} are listed here.` : ""}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Disclosed</th>
    <th style="text-align:left;padding:8px 12px">Market</th>
    <th style="text-align:left;padding:8px 12px">Company and insider</th>
    <th style="text-align:left;padding:8px 12px">Side</th>
    <th style="text-align:left;padding:8px 12px">Size</th>
    <th style="text-align:left;padding:8px 12px">Verdict</th>
  </tr></thead><tbody>${body}</tbody></table>
  <h2 style="font-size:15px;margin:32px 0 10px">What this is</h2>
  <p style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">Company insiders in most developed markets must tell the public when they trade their own company’s shares. Each country publishes that through its own regulator, in its own format, in its own currency and on its own clock. ddbx reads five of those feeds, screens and rates the filings in the markets where it runs an analysis layer, and publishes them by market. This page is those five lines with the walls taken down: one row shape, one order, the whole day. Each line carries what its market page carries, which is not every filing everywhere; the coverage below says what each one holds.</p>
  <h2 style="font-size:15px;margin:32px 0 10px">Market coverage</h2>
  <ul style="font-size:14px;line-height:1.6;max-width:72ch;padding-left:18px">${coverage}</ul>
  <h2 style="font-size:15px;margin:32px 0 10px">Reading the tape</h2>
  <p style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch"><strong>Side</strong> is bought or sold from the regulator’s own transaction type; grants, exercises and pledges are shown in words. The UK, US and Korean lines carry open-market purchases only, so a sale never appears for those three; Sweden and the Netherlands carry every notification. <strong>Disclosed</strong> is the time of day in the market’s own city where the regulator publishes one; Sweden does, the UK and US rows show when ddbx first saw the filing, and the Netherlands and Korea record only the day. <strong>Size</strong> is shares times price in the currency the filing was made in, never converted. <strong>Verdict</strong> is the same rating the filing page carries, from <a href="https://${esc(host)}/how-it-works">six published checks</a>; “unrated market” means Korea, where no rating layer runs.</p>
  <h2 style="font-size:15px;margin:32px 0 10px">How this is put together</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${method}</ul>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/how-it-works">How a filing is rated</a> · <a href="https://${esc(host)}/cluster-buys">Cluster buying</a> · <a href="https://${esc(host)}/mcp">Ask an assistant</a> · <a href="https://${esc(host)}/developers">The API</a></p>`);
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);

  const feeds = await fetchTapeFeeds({
    apiBase: API_BASE,
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 300, "400-499": 60, "500-599": 0 },
    },
  });

  const failed = TAPE_MARKETS.filter((m) => feeds[m.id].status !== "ok").map((m) => m.id);

  // Nothing answered: we could not find out. Serve the shell and let the next
  // crawl re-read, rather than caching a noindex over a bad minute.
  if (failed.length === TAPE_MARKETS.length) return shell;

  const { rows, floor, binding } = mergeTape(feeds);

  if (rows.length === 0) return noindex(shell);

  const shown = rows.slice(0, ROWS);
  const states = tapeMarketStates(feeds, rows);

  return renderInto(shell, {
    title: brandTitle(
      "The global insider tape — UK, US, Sweden, Netherlands and Korea, newest first",
    ),
    description: leadSentence(rows, floor, states),
    canonical: CANONICAL,
    breadcrumbs: [{ name: "Global tape", item: CANONICAL }],
    body: prerender(shown, rows, floor, binding, failed, states, host),
  });
}
