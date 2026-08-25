// Shared-trade links: ddbx.uk/t/{id}.
//
// The URL a tweet points at, the one iOS intercepts as a Universal Link (AASA
// at /.well-known/apple-app-site-association), and the coldest traffic the site
// receives. See ddbx-ios-app/investigations/2026-06-07-share-trade-deep-link.md.
//
// It serves two audiences, because anyone WITH the app is deep-linked into it
// before the request ever leaves the device:
//
//   1. preview crawlers (Twitterbot, iMessage, WhatsApp, Slack) — they read the
//      <head> and unfurl a card, and they do not run JS, which is the entire
//      reason this Function exists;
//   2. humans without the app — the people we most want to convert.
//
// ---------------------------------------------------------------------------
// This used to be a page. Now it is a pre-render.
// ---------------------------------------------------------------------------
//
// It was 458 lines of standalone HTML that never booted the SPA: its own
// stylesheet, its own inline GA4 bootstrap, its own rating badges, its own
// checklist markup, its own store-CTA device sniff, all rendered into a boxed
// card on a page with no navbar, no dark mode, no market switcher, no floating
// install bar, no broker rail, and no link to anything else on the site.
//
// Every one of those things already existed in React, and /dealings/{id} — the
// same filing at a different URL — had all of them plus the price chart, the
// expandable checks, the cluster panel and the outcome. A year of improvements
// landed on the page nobody arrives on, while the page cold traffic actually
// hits kept a thinner private copy of a subset of the same facts, and the two
// drifted without anything failing.
//
// So they are one page now (src/pages/filing.tsx, `share` mode) and this
// Function does what every other pre-render here does: fetch the row, rewrite
// the shell's <head>, inject the facts into #root for crawlers, and let React
// take over. What survived is only what a Function can do and the SPA cannot —
// the per-trade unfurl meta, and the App Store smart banner.
//
// ---------------------------------------------------------------------------
// Canonical
// ---------------------------------------------------------------------------
//
// Points at /dealings/{id}, not at itself. Both URLs now render the same
// document from the same row, and two indexable copies of one filing is exactly
// the duplicate-content split the rest of the site is careful to avoid. /t/{id}
// stays crawlable — robots.txt deliberately does not disallow it, because
// Twitterbot honours robots.txt and blocking it would break every unfurl — it
// just declares which of the two is the real address.

import { cleanName, money } from "../../shared/filings.js";
import {
  displayTicker,
  filingPrerender,
} from "../../shared/filing-prerender.js";
import { shareNotificationLine } from "../../shared/share-notification.js";
import { esc, fetchJson, noindex, renderInto } from "../../shared/prerender.js";
import { isProductionHost } from "../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
// The filing API and the canonical filing page are both UK-only: /api/dealings
// serves the UK pipeline and there is no per-row US detail route yet. US share
// links are a separate Function (functions/us/t/[id].js) that redirects to the
// store, and stay that way until the US side has a row to render.
const OWNING_HOST = "ddbx.uk";

/** iOS App Store id for Safari's smart banner. UK app; the US listing has its
 *  own id but never reaches this route. Only worth showing where the tap lands
 *  on an install — anyone who already has the app was deep-linked and never
 *  saw this page. */
const UK_APP_ID = "6762196330";

/** A shared link unfurls into the Worker's dynamic per-trade card: the company
 *  logo, the value, who bought, and the six-point check with its ticks and
 *  crosses (ddbx-data worker/pipeline/trade-og-image.ts).
 *
 *  It unfurled into the flat ddbx wordmark for a while, on the theory that the
 *  tweet text already carried the detail. But the wordmark gives a reader
 *  scrolling past no reason to stop, and on X the card IS the tweet's whole
 *  visual footprint. The card is the pitch.
 *
 *  1200×630, and the Worker redirects to a safe image of its own if the
 *  renderer throws, so this never resolves to a broken og:image. */
const tradeCardImage = (id) =>
  `${API_BASE}/dealings/${encodeURIComponent(id)}/og.png`;
const CARD_W = "1200";
const CARD_H = "630";

/** `?nocard=1` — the same page, served without the unfurl.
 *
 *  Our own X threads post the card as an uploaded PNG on the main tweet and
 *  then reply with the six-point check written out as ✅/❌ lines plus this
 *  link. The link's unfurl is the per-trade OG art, which draws those same six
 *  rows — so the thread carried two large images making one point, and the
 *  reply read as a duplicate of the post above it. The tweets we send now
 *  append this param and the reply is text plus a plain link.
 *
 *  Scoped to the parameter on purpose. A trade link shared by anyone else, in
 *  a DM, a Slack, an iMessage, is untouched and still unfurls into the card —
 *  that unfurl is the pitch to a reader who has never heard of us, and the
 *  reason this Function exists. This variant is only OUR link, in OUR thread,
 *  where the pitch is already on screen.
 *
 *  Card meta comes off wholesale rather than just the image: X falls back to
 *  Open Graph when twitter:card is absent, so leaving og:title/og:description
 *  behind risks a text-only card instead of no card. `noindex` goes on because
 *  the param is a distinct URL to a crawler and the bare /t/{id} (canonical:
 *  /dealings/{id}) is the copy that should be indexed. */
const NO_CARD_PARAM = "nocard";

function withoutUnfurl(res) {
  return new HTMLRewriter()
    .on('meta[property^="og:"], meta[name^="twitter:"]', {
      element(el) {
        el.remove();
      },
    })
    .on("head", {
      element(el) {
        el.append('<meta name="robots" content="noindex, follow">', {
          html: true,
        });
      },
    })
    .transform(res);
}

const VERBS = { buy: "bought", sell: "sold" };

/** The unfurl title. Facts only, and the same shape the standalone page used,
 *  because it is what the previews on already-published tweets look like.
 *
 *  GBP, and deliberately not `d.currency`: on a UK-pipeline row `value_gbp` is
 *  the canonical GBP-equivalent (FX-converted at the trade-date rate) while
 *  `currency` is the currency of the ORIGINAL RNS. A dollar reporter
 *  cross-listed in London files in USD, and labelling the first with the second
 *  printed "$108k" for a £107,818 buy. */
function unfurlTitle(d) {
  const director = d.director?.name || "A director";
  const company = cleanName(d.company) || "a company";
  const verb = VERBS[d.tx_type] || "traded";
  const amount = money(d.value_gbp);

  return amount
    ? `${director} ${verb} ${amount} of ${company}`
    : `${director} ${verb} shares in ${company}`;
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const id = String(params.id ?? "");
  // Our own tweets ask for the page without its card (see NO_CARD_PARAM). It
  // also covers the dead ends below: the shell's own og:image would otherwise
  // unfurl the site wordmark on a link we posted as bare text.
  const noCard = url.searchParams.get(NO_CARD_PARAM) === "1";

  // The SPA shell. React boots from this and takes over whatever we inject.
  const shell = await context.next();

  // Preview and local hosts still render the SPA; they just don't get the
  // pre-render, and robots.txt disallows them anyway.
  if (!isProductionHost(url.hostname)) return shell;
  // Validate the shape before spending an API call on it.
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) {
    return noCard ? withoutUnfurl(shell) : noindex(shell);
  }

  const d = await fetchJson(
    `${API_BASE}/dealings/${encodeURIComponent(id)}`,
    900,
  );

  // Unknown or unreachable. The SPA renders its own state for this, and it
  // tells missing apart from failed; all this adds is a noindex, so a stale
  // share link is not crawled as a bare shell. The crawler still gets the
  // site's default OG, so the unfurl degrades to brand art rather than
  // breaking.
  if (!d?.id) return noCard ? withoutUnfurl(shell) : noindex(shell);

  const canonical = `https://${OWNING_HOST}/dealings/${encodeURIComponent(d.id)}`;
  const name = cleanName(d.company) || displayTicker(d.ticker);
  const title = unfurlTitle(d);
  // The unfurl description IS the notification the page opens with, so the
  // preview a reader sees in the timeline and the card they land on say the
  // same sentence. The fallback is deterministic and never empty.
  const description =
    shareNotificationLine(d) ??
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
    body: filingPrerender(d, OWNING_HOST),
  });

  // The pre-render above still ran, so a human landing on a no-card link gets
  // the same document — only the unfurl meta comes off.
  if (noCard) return withoutUnfurl(rendered);

  // The image tags, which the shared head rewrite doesn't own, plus the smart
  // banner. These are REWRITES rather than appends: index.html already ships a
  // full og:image set for the site wordmark (1200×675), and appending a second
  // one leaves a crawler choosing between two — including two heights, one of
  // which does not describe the image it is served with.
  return new HTMLRewriter()
    .on('meta[property="og:image"], meta[name="twitter:image"]', {
      element(el) {
        el.setAttribute("content", tradeCardImage(d.id));
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
            `<meta name="apple-itunes-app" content="app-id=${esc(UK_APP_ID)}">`,
          { html: true },
        );
      },
    })
    .transform(rendered);
}
