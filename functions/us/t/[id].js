// Shared-trade links on the US market: ddbx.us/us/t/{id}.
//
// ---------------------------------------------------------------------------
// This used to be a redirect. Now it is a page.
// ---------------------------------------------------------------------------
//
// It was a nine-line UA sniff that bounced every visitor to an app store. That
// made sense while there was nothing to send them to — /api/us-dealings had no
// per-row detail route, so there was no way to render one US filing — and it
// stopped making sense on 2026-08-22, when that route landed alongside a
// per-trade OG card.
//
// The cost of the redirect was not theoretical. A shared US trade unfurled as
// the flat ddbx wordmark, and the tap went straight to a store listing that
// says nothing about the filing the reader had just been told about. That is
// the worst possible landing for the coldest traffic the site receives, and it
// was the destination for essentially every US trade we would ever want to
// link: the UK had 18 eligible names in a three-week window against 108 US
// ones, and 41 of the last 43 reply-radar ticker matches were US.
//
// So this is now functions/t/[id].js with the market swapped: fetch the row,
// rewrite the shell's <head>, inject the facts into #root for crawlers, and let
// React take over at /us/t/:id (src/pages/filing.tsx in `share` mode with
// market="US"). Everything market-dependent in both halves goes through
// shared/filing-family.js, which is what stops this page rendering a UK
// sentence over US numbers.
//
// ---------------------------------------------------------------------------
// Canonical
// ---------------------------------------------------------------------------
//
// Points at /us/dealings/{id}, mirroring the UK route's split: two URLs render
// the same document from the same row, and only one of them should be indexed.
// /us/t/{id} stays crawlable — Twitterbot honours robots.txt and blocking it
// would break every unfurl — it just declares which is the real address.
//
// ---------------------------------------------------------------------------
// Universal Links, and where the store CTA went
// ---------------------------------------------------------------------------
//
// Anyone WITH the US app never reaches here: iOS intercepts the link via
// /.well-known/apple-app-site-association and Android via assetlinks.json,
// opening the app directly. So this serves preview crawlers and people without
// the app, which is exactly who the page is written for. The store redirect it
// replaced survives as Safari's smart banner rather than as a 302, so a reader
// gets the filing first and the install offer second.

import { cleanName } from "../../../shared/filings.js";
import { filingFamily } from "../../../shared/filing-family.js";
import {
  displayTicker,
  filingPrerender,
} from "../../../shared/filing-prerender.js";
import { shareNotificationLine } from "../../../shared/share-notification.js";
import {
  esc,
  fetchJson,
  noindex,
  renderInto,
} from "../../../shared/prerender.js";
import { isProductionHost } from "../../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
const OWNING_HOST = "ddbx.us";
const MARKET = "US";
const FAMILY = filingFamily(MARKET);

/** iOS App Store id for Safari's smart banner — the US listing (ddbx-us), not
 *  the UK one this route used to send Android traffic to. Only worth showing
 *  where the tap lands on an install: anyone who already has the app was
 *  deep-linked and never saw this page. */
const US_APP_ID = "6772091960";

const CARD_W = "1200";
const CARD_H = "630";

/** The unfurl title. Facts only, in the market's own currency — the family
 *  pins USD rather than reading `d.currency`, for the reason the UK route
 *  documents at length (there, `currency` describes the RNS while the numbers
 *  beside it are FX-converted GBP, and conflating the two printed "$108k" for
 *  a £107,818 buy). On a US row the two agree, but the discipline is the same
 *  and the family stays the only place that decides it. */
function unfurlTitle(d) {
  const { name } = FAMILY.insider(d);
  const company = cleanName(d.company) || "a company";
  const verb = d.acquired_disposed === "D" ? "sold" : "bought";
  const amount = FAMILY.value(d) == null ? null : FAMILY.money(FAMILY.value(d));

  return amount
    ? `${name} ${verb} ${amount} of ${company}`
    : `${name} ${verb} shares in ${company}`;
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const id = String(params.id ?? "");

  // The SPA shell. React boots from this and takes over whatever we inject.
  const shell = await context.next();

  // Preview and local hosts still render the SPA; they just don't get the
  // pre-render, and robots.txt disallows them anyway.
  if (!isProductionHost(url.hostname)) return shell;
  // Validate the shape before spending an API call on it. Wider than the UK
  // pattern: a Form 4 leg id is `f4-{accession}-{table}-{row}`, so it carries
  // more dashes and runs longer than a UK "d-…" id.
  if (!/^[A-Za-z0-9_-]{4,96}$/.test(id)) return noindex(shell);

  const d = await fetchJson(
    `${API_BASE}/us-dealings/${encodeURIComponent(id)}`,
    900,
  );

  // Unknown or unreachable. The SPA renders its own state for this and tells
  // missing apart from failed; all this adds is a noindex, so a stale share
  // link is not crawled as a bare shell. The crawler still gets the site's
  // default OG, so the unfurl degrades to brand art rather than breaking.
  if (!d?.id) return noindex(shell);

  const canonical = `https://${OWNING_HOST}/us/dealings/${encodeURIComponent(d.id)}`;
  const name = cleanName(d.company) || displayTicker(d.ticker);
  const title = unfurlTitle(d);
  // The unfurl description IS the notification the page opens with, so the
  // preview a reader sees in the timeline and the card they land on say the
  // same sentence. The fallback is deterministic and never empty.
  const description =
    shareNotificationLine(d, MARKET) ??
    `${name} insider purchase, disclosed ${d.disclosed_date}.`;

  const rendered = renderInto(shell, {
    title,
    description,
    canonical,
    breadcrumbs: [
      { name: "Companies", item: `https://${OWNING_HOST}/companies` },
      {
        name,
        item: `https://${OWNING_HOST}/company/${displayTicker(d.ticker).toLowerCase()}`,
      },
      { name: `Disclosed ${d.disclosed_date}`, item: canonical },
    ],
    body: filingPrerender(d, OWNING_HOST, MARKET),
  });

  // The image tags, which the shared head rewrite doesn't own, plus the smart
  // banner. These are REWRITES rather than appends: index.html already ships a
  // full og:image set for the site wordmark (1200×675), and appending a second
  // one leaves a crawler choosing between two — including two heights, one of
  // which does not describe the image it is served with.
  return new HTMLRewriter()
    .on('meta[property="og:image"], meta[name="twitter:image"]', {
      element(el) {
        el.setAttribute("content", FAMILY.ogImage(d.id));
      },
    })
    .on('meta[property="og:image:width"]', {
      element(el) {
        el.setAttribute("content", CARD_W);
      },
    })
    .on('meta[property="og:image:height"]', {
      element(el) {
        el.setAttribute("content", CARD_H);
      },
    })
    .on('meta[property="og:image:alt"]', {
      element(el) {
        el.setAttribute("content", title);
      },
    })
    .on("head", {
      element(el) {
        el.append(
          `<meta name="twitter:image:alt" content="${esc(title)}">` +
            `<meta name="apple-itunes-app" content="app-id=${esc(US_APP_ID)}">`,
          { html: true },
        );
      },
    })
    .transform(rendered);
}
