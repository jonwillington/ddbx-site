// Crawler pre-render for the canonical US filing page: ddbx.us/us/dealings/{id}.
//
// The US mirror of functions/dealings/[id].js, added 2026-08-22 alongside the
// /us/t/{id} share route. Both exist for the same reason the UK pair does: the
// share URL is what a tweet points at and this is the address it canonicalises
// to, so this is the one that gets indexed — and an indexable URL whose crawler
// view is an empty <div id="root"> is not indexable in any useful sense.
//
// Everything market-dependent goes through shared/filing-family.js, so the
// title, the description and the injected body say the same things the UK page
// says about a UK row, in dollars and about a reporter rather than a director.
//
// The publishing bar is `filingMeetsBar` exactly as on the UK side: a filing
// gets an indexable page only once it carries a written analysis. An unanalysed
// US row still RENDERS here — a link must never 404 — with noindex and no
// sitemap entry, and becomes indexable on its own if an analysis lands later,
// with no code change.

import { cleanName, filingMeetsBar } from "../../../shared/filings.js";
import { filingFamily } from "../../../shared/filing-family.js";
import {
  displayTicker,
  filingPrerender,
} from "../../../shared/filing-prerender.js";
import { apexHost, noindex, renderInto } from "../../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
const OWNING_HOST = "ddbx.us";
const MARKET = "US";
const FAMILY = filingFamily(MARKET);

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const id = String(params.id ?? "");

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  // One host owns this document. ddbx.uk/us/dealings/{id} resolves through the
  // shared bundle, and two indexable copies of one filing is exactly the
  // duplicate-content split the rest of the site is careful to avoid.
  if (host !== OWNING_HOST) return noindex(shell);
  // Wider than the UK pattern: a Form 4 leg id is `f4-{accession}-{table}-{row}`.
  if (!/^[A-Za-z0-9_-]{4,96}$/.test(id)) return noindex(shell);

  const res = await fetch(`${API_BASE}/us-dealings/${encodeURIComponent(id)}`, {
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 900, "400-499": 60, "500-599": 0 },
    },
  });

  if (!res.ok) return noindex(shell);
  const d = await res.json();

  if (!d?.id) return noindex(shell);
  if (!filingMeetsBar(d)) return noindex(shell);

  const name = cleanName(d.company) || displayTicker(d.ticker);
  const canonical = `https://${OWNING_HOST}${FAMILY.path(d.id)}`;
  const { role } = FAMILY.insider(d);
  const amount = FAMILY.value(d) == null ? null : FAMILY.money(FAMILY.value(d));

  return renderInto(shell, {
    title: brandTitle(
      amount
        ? `${name} — ${role || "insider"} buys ${amount}`
        : `${name} — ${role || "insider"} purchase`,
    ),
    description: FAMILY.leadSentence(d),
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
}
