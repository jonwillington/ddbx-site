// Crawler pre-render for one disclosure: /dealings/d-1825cd96b288f7e1.
//
// The publishing bar is `filingMeetsBar` — the row carries a written analysis —
// which is the whole reason this family is safe to publish at scale. See the
// header of shared/filings.js for that argument and for the discretion-mode
// boundary this Function has to respect: what a crawler reads here is exactly
// what a visitor reads, because the alternative is cloaking.
//
// ddbx.uk only for now. /api/dealings/:id serves the UK pipeline; the US
// equivalent is /api/us-dealings and has no per-row detail route yet, so a
// filing page on ddbx.us would 404 against the API rather than render thin.
// Adding US is a follow-up on the data side, not a change here.

import {
  cleanName,
  filingLeadSentence,
  filingMeetsBar,
  filingPath,
  money,
} from "../../shared/filings.js";
import {
  displayTicker,
  filingPrerender,
} from "../../shared/filing-prerender.js";
import { apexHost, noindex, renderInto } from "../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
const OWNING_HOST = "ddbx.uk";

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const id = String(params.id ?? "");

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (host !== OWNING_HOST) return noindex(shell);
  // Validate the shape before spending an API call on it.
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return noindex(shell);

  const res = await fetch(`${API_BASE}/dealings/${encodeURIComponent(id)}`, {
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 900, "400-499": 60, "500-599": 0 },
    },
  });

  if (!res.ok) return noindex(shell);
  const d = await res.json();

  if (!d?.id) return noindex(shell);
  // The bar: only rows carrying a written analysis are indexable. Everything
  // else renders here and stays out of the index, and crosses the bar on its
  // own if an analysis lands later.
  if (!filingMeetsBar(d)) return noindex(shell);

  const name = cleanName(d.company) || displayTicker(d.ticker);
  const canonical = `https://${OWNING_HOST}${filingPath(d.id)}`;

  return renderInto(shell, {
    title: brandTitle(
      `${name} — ${d.director?.role || "insider"} buys ${money(d.value_gbp)}`,
    ),
    description: filingLeadSentence(d),
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
}
