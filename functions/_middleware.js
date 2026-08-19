// Server-rendered <head> for the SPA shell.
//
// The site is one static index.html served on every domain (ddbx.uk / ddbx.us /
// ddbx.eu). Crawlers don't run the SPA's JS, so the per-route tags that
// document-title.tsx sets at runtime never reach them — search engines and
// link-preview bots would otherwise see the static UK homepage title on every
// single route. This middleware rewrites the shell per request:
//
//   - <title>, description, og:title/description/url, twitter:title/description
//     from the shared route table (shared/seo.js — the same module the SPA
//     uses, so the tab and the SERP can't disagree)
//   - og:image / twitter:image swapped to the dark (US) wordmark on ddbx.us
//   - rel=canonical, which folds the cross-domain duplicates together
//     (ddbx.uk/us and ddbx.us/ are the same page)
//   - robots noindex on preview/local hosts and the handful of utility routes
//
// Per-trade share links (/t/{id}) own their head rewrite in
// functions/t/[id].js — per-deal unfurl meta and a canonical pointing at
// /dealings/{id} — so we leave those untouched. Listed with the other
// pre-render routes below.

import {
  alternatesFor,
  canonicalUrlFor,
  isForeignResearchPath,
  isIndexable,
  langForPath,
  seoForPath,
} from "../shared/seo.js";

function ogImageFor(origin, host) {
  // US market → dark wordmark; everything else → light. Same-origin so the image
  // resolves on whichever domain served the page.
  const dark = host.endsWith("ddbx.us");

  return `${origin}/${dark ? "og-us.png" : "og-uk.png"}`;
}

// Attribute values land inside double-quoted HTML attributes; company and
// broker names reach these strings, so escape rather than trust them.
function attr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Text nodes (the <title> body) need the same treatment minus the quotes.
function text(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Rewrite an existing <meta content="…"> in place. */
const setContent = (value) => ({
  element(el) {
    el.setAttribute("content", value);
  },
});

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // The UK/US research pages have no SE/NL equivalent, so on ddbx.eu they were
  // rendering UK data under UK headings with a Swedish flag in the navbar.
  // Send them to the host that owns the content instead — same path, so a
  // shared link still lands where it meant to. 301: the EU URL is not a
  // distinct page and should not accumulate its own index entry.
  if (isForeignResearchPath(url.pathname, url.hostname)) {
    const target = new URL(url.toString());

    target.hostname = "ddbx.uk";

    return Response.redirect(target.toString(), 301);
  }

  const res = await next();

  // Only the HTML shell needs rewriting; assets pass straight through.
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return res;
  // Routes served by their own pre-render Function own their entire <head> —
  // they set the title, description, canonical and OG tags themselves, from
  // data this module never sees.
  //
  // Skipping them isn't only about titles. Every tag below is APPENDED to
  // <head> rather than rewritten in place (index.html carries no canonical or
  // twitter:* to overwrite), so running both passes emits two rel=canonical
  // tags for the same page — and a page with conflicting canonicals has both
  // ignored, which is worse than having none.
  if (
    url.pathname.startsWith("/t/") ||
    url.pathname.startsWith("/company/") ||
    url.pathname === "/companies" ||
    url.pathname.startsWith("/brokers/best-for/") ||
    url.pathname.startsWith("/brokers/compare/") ||
    url.pathname === "/reports" ||
    /^\/reports\/[^/]+$/.test(url.pathname) ||
    url.pathname === "/sectors" ||
    /^\/sectors\/[^/]+$/.test(url.pathname) ||
    url.pathname === "/biggest-buys" ||
    url.pathname.startsWith("/biggest-buys/") ||
    url.pathname === "/best-performing-buys" ||
    url.pathname === "/most-active-companies" ||
    url.pathname === "/cluster-buys" ||
    url.pathname === "/roles" ||
    /^\/roles\/[^/]+$/.test(url.pathname) ||
    url.pathname === "/market-cap" ||
    /^\/market-cap\/[^/]+$/.test(url.pathname) ||
    url.pathname === "/learn" ||
    /^\/learn\/[^/]+$/.test(url.pathname) ||
    // The Congress directory. NOT a bare /congress/ prefix: /congress itself is
    // the market dashboard and still wants this module's head, so only the two
    // sub-families and their detail pages are excluded.
    /^\/dealings\/[^/]+$/.test(url.pathname) ||
    url.pathname === "/weekly" ||
    /^\/weekly\/[^/]+$/.test(url.pathname) ||
    url.pathname === "/congress/members" ||
    /^\/congress\/members\/[^/]+$/.test(url.pathname) ||
    url.pathname === "/congress/committees" ||
    /^\/congress\/committees\/[^/]+$/.test(url.pathname) ||
    url.pathname === "/how-it-works"
  ) {
    return res;
  }

  const host = url.hostname.toLowerCase();
  const { title, description } = seoForPath(url.pathname, host);
  const image = ogImageFor(url.origin, host);
  // Query strings are view state (?view=signal, filters), not distinct pages —
  // the canonical is always the bare path.
  const canonical = canonicalUrlFor(url.pathname, host);
  const indexable = isIndexable(url.pathname, host);
  // The Traditional Chinese install pages are the site's only non-English
  // route family. index.html is hard-coded lang="en", which on those pages
  // tells a screen reader to read Chinese with an English voice and tells the
  // browser to offer to translate a page that is already in the reader's
  // language. The SPA re-asserts this on client-side navigations (see
  // pages/download.tsx) — this pass is what a crawler and a first paint see.
  const lang = langForPath(url.pathname);
  const alternates = alternatesFor(url.pathname, host);

  const setImage = setContent(image);

  return new HTMLRewriter()
    .on("html", {
      element(el) {
        el.setAttribute("lang", lang);
      },
    })
    .on("title", {
      element(el) {
        el.setInnerContent(text(title), { html: true });
      },
    })
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(description))
    .on('meta[property="og:image"]', setImage)
    .on('meta[name="twitter:image"]', setImage)
    // og:url, twitter:* and rel=canonical have no static tag in index.html —
    // append them once, at the end of <head>.
    .on("head", {
      element(el) {
        // og:type, twitter:card, twitter:site and the image tags are already
        // static in index.html — only what's missing or per-route goes here.
        const tags = [
          `<meta property="og:url" content="${attr(canonical ?? url.origin + url.pathname)}">`,
          `<meta property="og:site_name" content="ddbx">`,
          `<meta name="twitter:title" content="${attr(title)}">`,
          `<meta name="twitter:description" content="${attr(description)}">`,
        ];

        if (canonical) {
          tags.push(`<link rel="canonical" href="${attr(canonical)}">`);
        }
        // Empty everywhere except the bilingual UK install pages.
        for (const alt of alternates) {
          tags.push(
            `<link rel="alternate" hreflang="${attr(alt.hreflang)}" href="${attr(alt.href)}">`,
          );
        }
        if (!indexable) {
          tags.push(`<meta name="robots" content="noindex, follow">`);
        }
        el.append(tags.join("\n"), { html: true });
      },
    })
    .transform(res);
}
