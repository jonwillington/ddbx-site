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
  stripTrailingSlash,
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

  // Two reasons to send a request somewhere else, resolved together so a URL
  // that needs both gets one hop rather than a chain.
  //
  //   1. Trailing slash. Pages serves /companies/ and /companies as the same
  //      document, so every route on the site has quietly had two addresses.
  //      That is the duplicate-content split the canonicals exist to prevent,
  //      and on the pre-rendered families it was worse than a duplicate: the
  //      skip list below matches the path exactly, so the slashed form fell
  //      through and picked up a SECOND rel=canonical on top of the one the
  //      Function had already written. A page with two canonicals has both
  //      ignored. 301 the slash away and the whole class disappears.
  //   2. The UK/US research pages have no SE/NL equivalent, so on ddbx.eu they
  //      were rendering UK data under UK headings with a Swedish flag in the
  //      navbar. Send them to the host that owns the content instead — same
  //      path, so a shared link still lands where it meant to. 301: the EU URL
  //      is not a distinct page and should not accumulate its own index entry.
  const normalisedPath = stripTrailingSlash(url.pathname);
  const foreignResearch = isForeignResearchPath(normalisedPath, url.hostname);

  if (normalisedPath !== url.pathname || foreignResearch) {
    const target = new URL(url.toString());

    target.pathname = normalisedPath;
    if (foreignResearch) target.hostname = "ddbx.uk";

    return Response.redirect(target.toString(), 301);
  }

  const res = await next();

  // Only the HTML shell needs rewriting; assets pass straight through.
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return res;
  // Lowercased for the match below. Pages resolves /Companies to the same
  // Function that /companies does, but the exact comparisons in the skip list
  // are case-sensitive, so the mixed-case form fell through and collected a
  // second rel=canonical on top of the Function's — the same double-canonical
  // failure the trailing-slash redirect above closes. Every entry in the list
  // is a lowercase literal or an anchored pattern, so lowering is safe.
  const routePath = url.pathname.toLowerCase();

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
    routePath.startsWith("/t/") ||
    // The US filing pair, added 2026-08-22 — both own their whole <head>, same
    // as their UK counterparts two lines up and below.
    routePath.startsWith("/us/t/") ||
    /^\/us\/dealings\/[^/]+$/.test(routePath) ||
    routePath.startsWith("/company/") ||
    routePath === "/companies" ||
    routePath.startsWith("/brokers/best-for/") ||
    routePath.startsWith("/brokers/compare/") ||
    routePath === "/reports" ||
    /^\/reports\/[^/]+$/.test(routePath) ||
    routePath === "/sectors" ||
    /^\/sectors\/[^/]+$/.test(routePath) ||
    routePath === "/biggest-buys" ||
    routePath.startsWith("/biggest-buys/") ||
    routePath === "/best-performing-buys" ||
    routePath === "/most-active-companies" ||
    routePath === "/cluster-buys" ||
    routePath === "/roles" ||
    /^\/roles\/[^/]+$/.test(routePath) ||
    routePath === "/market-cap" ||
    /^\/market-cap\/[^/]+$/.test(routePath) ||
    routePath === "/learn" ||
    /^\/learn\/[^/]+$/.test(routePath) ||
    // The Congress directory. NOT a bare /congress/ prefix: /congress itself is
    // the market dashboard and still wants this module's head, so only the two
    // sub-families and their detail pages are excluded.
    /^\/dealings\/[^/]+$/.test(routePath) ||
    routePath === "/weekly" ||
    /^\/weekly\/[^/]+$/.test(routePath) ||
    routePath === "/congress/members" ||
    /^\/congress\/members\/[^/]+$/.test(routePath) ||
    routePath === "/congress/committees" ||
    /^\/congress\/committees\/[^/]+$/.test(routePath) ||
    routePath === "/how-it-works"
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
  // The backstop for the whole double-canonical class. The skip list above is
  // hand-maintained and every entry it is missing is a page that gets two
  // conflicting rel=canonical tags — which Google resolves by discarding both
  // and picking a canonical of its own, i.e. the "Duplicate, Google chose
  // different canonical than user" bucket. Rather than trust the list, watch
  // the stream: if the response already carries a canonical, the Function that
  // produced it knew more about the page than this module does, and we add
  // neither our own canonical nor the og:url that would disagree with it.
  //
  // Handlers fire in document order and `onEndTag` fires after the element's
  // children, so a canonical anywhere in <head> is seen before </head>.
  let hasCanonical = false;

  return new HTMLRewriter()
    .on('link[rel="canonical"]', {
      element() {
        hasCanonical = true;
      },
    })
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
        el.onEndTag((end) => {
          // og:type, twitter:card, twitter:site and the image tags are already
          // static in index.html — only what's missing or per-route goes here.
          const tags = [
            `<meta property="og:site_name" content="ddbx">`,
            `<meta name="twitter:title" content="${attr(title)}">`,
            `<meta name="twitter:description" content="${attr(description)}">`,
          ];

          // og:url travels with the canonical: both name the page's one true
          // address, so emitting ours over a Function's would contradict it.
          if (!hasCanonical) {
            tags.unshift(
              `<meta property="og:url" content="${attr(canonical ?? url.origin + url.pathname)}">`,
            );
            if (canonical) {
              tags.push(`<link rel="canonical" href="${attr(canonical)}">`);
            }
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
          end.before(tags.join("\n"), { html: true });
        });
      },
    })
    .transform(res);
}
