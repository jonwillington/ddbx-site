// Crawler pre-render for a glossary entry: /learn/pdmr.
//
// The interesting part here isn't the rendering, it's the ownership rule.
//
// One SPA serves three domains, so without intervention every entry exists at
// ddbx.uk/learn/pdmr, ddbx.us/learn/pdmr and ddbx.eu/learn/pdmr with identical
// text — three URLs competing to rank for one piece of writing, which is the
// most likely unforced error in this whole page family.
//
// So shared/glossary.js gives every entry exactly one owning host, and this
// Function enforces it: on the owning domain the entry is rendered and
// indexable; on any other domain it still renders (the URL shouldn't 404 for a
// reader who followed a link) but carries a noindex and a canonical pointing
// at the owner. There is never a duplicate for a search engine to choose
// between, and no hreflang to keep in step.

import {
  canonicalUrlForEntry,
  entryBySlug,
  learnPath,
  ownerForHost,
  OWNER_HOST,
} from "../../shared/glossary.js";
import { esc, noindex, page, renderInto } from "../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

function prerender(entry, host) {
  const paras = entry.body
    .map(
      (p) =>
        `<p style="font-size:16px;line-height:1.65;color:#4a4034;max-width:64ch">${esc(p)}</p>`,
    )
    .join("");

  const related = entry.related
    .map((slug) => entryBySlug(slug))
    .filter(Boolean)
    .map(
      (e) =>
        `<li style="margin-bottom:6px"><a href="https://${esc(OWNER_HOST[e.owner])}${esc(learnPath(e.slug))}">${esc(e.title)}</a></li>`,
    )
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 16px">${esc(entry.title)}</h1>
  ${paras}
  ${related ? `<h2 style="font-size:15px;margin:32px 0 10px">Related</h2><ul style="font-size:14px;line-height:1.7">${related}</ul>` : ""}
  <p style="margin-top:32px;font-size:14px"><a href="https://${esc(host)}/learn">Every explainer</a> · <a href="https://${esc(host)}/companies">Browse companies</a></p>
  <p style="margin-top:16px;font-size:13px;color:#6b6154;max-width:62ch">Information only, not investment advice.</p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const entry = entryBySlug(decodeURIComponent(String(params.slug ?? "")));

  const shell = await context.next();

  // On the middleware's skip list, so the preview-host noindex lands here.
  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (!entry) return noindex(shell);

  const canonical = canonicalUrlForEntry(entry);
  const owner = ownerForHost(host);

  // Served by a domain that doesn't own this entry (including ddbx.eu, which
  // owns none). Render it, point the canonical at the owner, and keep this
  // copy out of the index.
  if (owner !== entry.owner) {
    return new HTMLRewriter()
      .on("head", {
        element(el) {
          el.append(
            [
              `<link rel="canonical" href="${esc(canonical)}">`,
              `<meta name="robots" content="noindex, follow">`,
            ].join("\n"),
            { html: true },
          );
        },
      })
      .on("#root", {
        element(el) {
          el.setInnerContent(prerender(entry, host), { html: true });
        },
      })
      .transform(shell);
  }

  return renderInto(shell, {
    title: brandTitle(entry.title),
    description: entry.description,
    canonical,
    breadcrumbs: [
      { name: "Learn", item: `https://${host}/learn` },
      { name: entry.term, item: canonical },
    ],
    body: prerender(entry, host),
  });
}
