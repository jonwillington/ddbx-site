// Crawler pre-renders for the daily editions, shared by the four Functions
// (functions/daily/*, functions/us/daily/*) the way shared/filing-prerender.js
// is shared by the filing families. One body renderer, one archive renderer,
// and one `handle` that does the fetching and the indexability decision, so
// the UK and US Functions are four thin wrappers that differ in one argument.
//
// What a crawler reads here is exactly what a reader reads: the same
// shared/days.js model, the same sentences. The only markup is the inline
// styles every renderInto() family uses to keep the pre-hydration view
// legible; React owns real presentation.

import {
  archiveLeadSentence,
  closedSentence,
  dailyIndexPath,
  dailyMarket,
  dailyPath,
  dateLabel,
  dayLabel,
  dayMoney,
  dayStatus,
  editionLeadSentence,
  editionMeetsBar,
  fetchArchive,
  fetchEdition,
  filingHref,
  insiderOf,
  isDateSlug,
  latestEditionDate,
  monthHeading,
  nearestEditionDate,
  nextTradingDay,
  overviewNarrative,
  prevTradingDay,
  verdictLine,
} from "./days.js";
import {
  apexHost,
  esc,
  noindex,
  page,
  renderInto,
  unresolved,
} from "./prerender.js";
import { brandTitle, isProductionHost } from "./seo.js";

const API_BASE = "https://api.ddbx.uk/api";

const CF_EDITION = {
  cacheEverything: true,
  // Today's edition changes through the session; a closed day does not, but
  // the same TTL serves both because the summary can land hours after the
  // last filing and a crawler that arrives in between should not be held to
  // the version without it for long.
  cacheTtlByStatus: { "200-299": 300, "400-499": 60, "500-599": 0 },
};
const CF_ARCHIVE = {
  cacheEverything: true,
  cacheTtlByStatus: { "200-299": 1800, "400-499": 60, "500-599": 0 },
};

const H1 = "font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px";
const LEDE = "font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch";
const H2 = "font-size:15px;margin:32px 0 10px";
const QUIET = "font-size:13px;color:#6b6154;max-width:62ch";
const CELL = "padding:8px 12px;border-bottom:1px solid #ece1cf";
const EYEBROW =
  "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";

const cleanCompany = (c) => {
  let out = String(c ?? "").trim();

  for (;;) {
    const next = out
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
      .trim();

    if (next === out || next === "") return out;
    out = next;
  }
};
const cleanInsider = (n) =>
  String(n ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim() || String(n ?? "");
const displayTicker = (t) => String(t ?? "").replace(/\.L$/i, "");
const rowValue = (d) => Number(d?.value_gbp ?? d?.value ?? 0);

/** `**bold**` -> <strong>, everything else escaped. */
function proseHtml(markdown) {
  return String(markdown ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="font-size:15px;line-height:1.65;max-width:62ch">${esc(p).replace(
          /\*\*([^*]+)\*\*/g,
          "<strong>$1</strong>",
        )}</p>`,
    )
    .join("");
}

function editionBody({ model, summary, summaryStatus, status, market, host }) {
  const m = dailyMarket(market);
  const prev = prevTradingDay(model.date, market);
  const next = nextTradingDay(model.date, market);
  const latest = latestEditionDate(market);
  const link = (iso, text) =>
    `<a href="https://${esc(host)}${esc(dailyPath(market, iso))}">${esc(text)}</a>`;

  const numbers =
    model.count === 0
      ? `<p style="${QUIET}">${esc(editionLeadSentence(model, status))}</p>`
      : `<p style="font-size:14px;color:#4a4034;max-width:62ch">${esc(model.count)} ${model.count === 1 ? "filing" : "filings"} · ${esc(dayMoney(model.value, m.currency))} · ${esc(model.companies)} ${model.companies === 1 ? "company" : "companies"} · ${esc(model.rated)} rated</p>`;

  const read =
    summary
      ? `<h3 style="font-size:18px;margin:0 0 8px">${esc(summary.headline)}</h3>${proseHtml(summary.body)}${
          summary.market_overview && Number.isFinite(summary.market_overview.pct)
            ? `<p style="${QUIET}">${esc(summary.market_overview.label)} ${summary.market_overview.pct > 0 ? "+" : ""}${esc(summary.market_overview.pct.toFixed(2))}%${overviewNarrative(summary) ? ` · ${esc(overviewNarrative(summary))}` : ""}</p>`
            : ""
        }<p style="${QUIET}">Written by the ddbx team, drafted with AI assistance after the close. Nothing here is advice.</p>`
      : summaryStatus === "failed"
        ? `<p style="${QUIET}">The day’s summary could not be loaded.</p>`
        : `<p style="${QUIET}">${
            status === "today"
              ? `No summary yet. The day’s read is written ${esc(m.summaryTime)}.`
              : "No summary was written for this day; the filings stand alone."
          }</p>`;

  const big = model.biggest;
  const money =
    big
      ? `<p style="font-size:14px;max-width:62ch"><strong>Biggest buy:</strong> ${esc(cleanInsider(insiderOf(big, market).name))}${insiderOf(big, market).role ? `, ${esc(insiderOf(big, market).role)}` : ""} at <a href="https://${esc(host)}${esc(filingHref(big, market) ?? "")}">${esc(cleanCompany(big.company) || displayTicker(big.ticker))}</a>, ${esc(dayMoney(rowValue(big), m.currency))}. ${esc(verdictLine(big))}</p>` +
        (model.clusters.length
          ? `<p style="font-size:14px;max-width:62ch"><strong>Cluster activity:</strong> ${model.clusters
              .map(
                (c) =>
                  `${esc(cleanCompany(c.company) || displayTicker(c.ticker))} (${esc(c.count)} ${c.count === 1 ? "buyer" : "buyers"} in ${esc(c.windowDays)} days)`,
              )
              .join("; ")}.</p>`
          : `<p style="${QUIET}">No cluster activity: no purchase disclosed on this day joined another insider’s buy in the same company within the previous fortnight.</p>`)
      : "";

  const rows = model.filings
    .map((d, i) => {
      const who = insiderOf(d, market);
      const href = filingHref(d, market);
      const name = cleanCompany(d.company) || displayTicker(d.ticker);

      return `<tr>
      <td style="${CELL}">${i + 1}</td>
      <td style="${CELL}">${href ? `<a href="https://${esc(host)}${esc(href)}">${esc(name)}</a>` : esc(name)}<span style="display:block;font-size:12px;color:#6b6154;margin-top:2px">${esc(cleanInsider(who.name))}${who.role ? `, ${esc(who.role)}` : ""}</span></td>
      <td style="${CELL}">${esc(verdictLine(d))}</td>
      <td style="${CELL}">${esc(dayMoney(rowValue(d), m.currency))}</td>
    </tr>`;
    })
    .join("");

  const table = model.count
    ? `<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">#</th>
    <th style="text-align:left;padding:8px 12px">Company and who bought</th>
    <th style="text-align:left;padding:8px 12px">Verdict</th>
    <th style="text-align:left;padding:8px 12px">Value</th>
  </tr></thead><tbody>${rows}</tbody></table>`
    : "";

  const nav = [
    prev && prev >= m.since ? link(prev, `← ${dayLabel(prev)}`) : "",
    next && latest && next <= latest ? link(next, `${dayLabel(next)} →`) : "",
    `<a href="https://${esc(host)}${esc(dailyIndexPath(market))}">Every trading day</a>`,
    `<a href="https://${esc(host)}/weekly">Week by week</a>`,
  ]
    .filter(Boolean)
    .join(" · ");

  return page(`<p style="${EYEBROW}">Daily edition</p>
  <h1 style="${H1}">${esc(m.label)} insider buying, ${esc(dayLabel(model.date))}</h1>
  <p style="${LEDE}">${esc(editionLeadSentence(model, status))}</p>
  <h2 style="${H2}">The day in numbers</h2>
  ${numbers}
  <h2 style="${H2}">The read</h2>
  ${read}
  <h2 style="${H2}">Where the money went</h2>
  ${money}
  <h2 style="${H2}">Every filing</h2>
  <p style="${QUIET}">Largest first. Each row is the filing’s own page.</p>
  ${table}
  <h2 style="${H2}">What this is</h2>
  <p style="font-size:14px;line-height:1.6;color:#4a4034;max-width:64ch">One page per trading day, permanent: every open-market purchase ${esc(m.label)} ${esc(m.noun)} disclosed that day, the verdict our six checks reached on each, the day’s largest cheque and any company where more than one insider was buying. Values are as filed. Nothing here is advice. <a href="https://${esc(host)}/how-it-works">How the rating is reached</a>.</p>
  <p style="margin-top:24px;font-size:14px">${nav}</p>`);
}

function archiveBody({ days, complete, market, host }) {
  const m = dailyMarket(market);
  let heading = "";
  const rows = days
    .map((d) => {
      const month = monthHeading(d.date);
      const head =
        month !== heading
          ? `<tr><th colspan="2" style="text-align:left;padding:18px 12px 6px;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128">${esc(month)}</th></tr>`
          : "";

      heading = month;

      return `${head}<tr>
      <td style="${CELL}"><a href="https://${esc(host)}${esc(dailyPath(market, d.date))}">${esc(dayLabel(d.date))}</a></td>
      <td style="${CELL}">${esc(d.count)} ${d.count === 1 ? "filing" : "filings"} · ${esc(dayMoney(d.value, m.currency))} · ${d.rated > 0 ? `${esc(d.rated)} rated` : "none rated"}</td>
    </tr>`;
    })
    .join("");

  return page(`<p style="${EYEBROW}">Daily editions</p>
  <h1 style="${H1}">${esc(m.label)} insider buying, day by day</h1>
  <p style="${LEDE}">${esc(archiveLeadSentence(days, market))}</p>
  <h2 style="${H2}">Every trading day</h2>
  <p style="${QUIET}">${complete ? "Newest first. A trading day with nothing filed has no entry; a weekend or a holiday never does." : "Newest first. The whole record could not be loaded, so the oldest days may be missing."}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>${rows}</tbody></table>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/weekly">Week by week</a> · <a href="https://${esc(host)}/reports">Monthly reports</a> · <a href="https://${esc(host)}/biggest-buys">Biggest buys</a></p>`);
}

/** The archive index for a market. */
export async function handleArchive(context, market) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);
  const m = dailyMarket(market);
  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  // The path carries the market; only the owning host publishes it.
  if (host !== m.host) return noindex(shell);

  let archive;

  try {
    archive = await fetchArchive({ apiBase: API_BASE, market: m.id, cf: CF_ARCHIVE });
  } catch {
    return shell;
  }

  // Nothing at all is an outage or a cold table, not an empty archive.
  if (!archive.days.length) return shell;

  const canonical = `https://${host}${dailyIndexPath(m.id)}`;

  return renderInto(shell, {
    title: brandTitle(`${m.label} insider buying, day by day`),
    description: archiveLeadSentence(archive.days, m.id),
    canonical,
    breadcrumbs: [{ name: "Daily editions", item: canonical }],
    body: archiveBody({ ...archive, market: m.id, host }),
  });
}

/** One day for a market. */
export async function handleEdition(context, market) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const m = dailyMarket(market);
  const slug = decodeURIComponent(String(params.date ?? ""));
  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (host !== m.host) return noindex(shell);
  if (!isDateSlug(slug)) return noindex(shell);

  const status = dayStatus(slug, m.id);

  // A weekend, a holiday, a future date or one before the record. The SPA
  // renders the signpost; a crawler gets a noindex and the nearest edition to
  // follow, so the URL is never a dead end and never a thin page.
  if (status !== "past" && status !== "today") {
    const nearest = nearestEditionDate(slug, m.id);

    return new HTMLRewriter()
      .on("head", {
        element(el) {
          el.append('<meta name="robots" content="noindex, follow">', {
            html: true,
          });
        },
      })
      .on("#root", {
        element(el) {
          el.setInnerContent(
            page(`<h1 style="${H1}">No edition for ${esc(dateLabel(slug))}</h1>
  <p style="${LEDE}">${esc(closedSentence(slug, m.id, status))}</p>
  <p style="font-size:14px">${nearest ? `<a href="https://${esc(host)}${esc(dailyPath(m.id, nearest))}">${esc(dayLabel(nearest))}</a> · ` : ""}<a href="https://${esc(host)}${esc(dailyIndexPath(m.id))}">Every trading day</a></p>`),
            { html: true },
          );
        },
      })
      .transform(shell);
  }

  let edition;

  try {
    edition = await fetchEdition({
      apiBase: API_BASE,
      market: m.id,
      date: slug,
      cf: CF_EDITION,
    });
  } catch {
    return shell;
  }

  // A 4xx on the feed is an answer; a 5xx or a thrown fetch is not, and a
  // noindex served on a bad minute outlives the outage by weeks.
  if (edition.status.dealings !== "ok")
    return unresolved(shell, edition.status.http);
  // A trading day with nothing filed (or today, before anything has) is a
  // sentence on the nearest edition, not a document. It crosses the bar on
  // its own once a filing lands.
  if (!editionMeetsBar(edition.model)) return noindex(shell);

  const canonical = `https://${host}${dailyPath(m.id, slug)}`;

  return renderInto(shell, {
    title: brandTitle(`${m.label} insider buying, ${dayLabel(slug)}`),
    description: editionLeadSentence(edition.model, status),
    canonical,
    breadcrumbs: [
      { name: "Daily editions", item: `https://${host}${dailyIndexPath(m.id)}` },
      { name: dateLabel(slug), item: canonical },
    ],
    body: editionBody({
      model: edition.model,
      summary: edition.summary,
      summaryStatus: edition.status.summary,
      status,
      market: m.id,
      host,
    }),
  });
}

/** /today and /us/today: 302 to the latest trading day's dated URL.
 *
 *  Computed in the market's own time zone at the edge, so the redirect and
 *  the SPA's own <Navigate> agree. Short-cached: the target changes once a
 *  day and a five-minute hold across midnight costs one reader one stale
 *  edition, while an uncached redirect costs every reader a Function run. */
export function handleToday(context, market) {
  const url = new URL(context.request.url);
  const m = dailyMarket(market);
  const date = latestEditionDate(m.id) ?? m.since;

  return new Response(null, {
    status: 302,
    headers: {
      location: `${url.origin}${dailyPath(m.id, date)}`,
      "cache-control": "public, max-age=300",
      "x-robots-tag": "noindex",
    },
  });
}
