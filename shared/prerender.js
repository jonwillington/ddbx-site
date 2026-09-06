// Primitives shared by the crawler pre-render Functions.
//
// Every page family that wants to be indexed needs the same four things, and
// functions/company/[key].js grew its own copy of all of them first:
//
//   1. HTML escaping for values that reach attributes and text nodes
//   2. apex-host normalisation (www.ddbx.uk and ddbx.uk share a URL set)
//   3. a <head> rewrite — title, description, canonical, OG/Twitter
//   4. BreadcrumbList JSON-LD
//
// With one Function that duplication was invisible. At four it's the thing that
// makes the families disagree about, say, whether og:site_name is set. So the
// primitives live here, next to shared/seo.js, for the same reason that module
// does: Pages Functions and the Vite app are bundled separately and a
// dependency-free ESM module at the root is the one shape both accept.
//
// ---------------------------------------------------------------------------
// On structured data
// ---------------------------------------------------------------------------
//
// BreadcrumbList only, deliberately. Of the schema types these pages could
// plausibly emit:
//
//   - FAQPage no longer produces rich results for sites like ours — Google
//     restricted it to a narrow set of authoritative sources, so marking up an
//     FAQ buys nothing and still has to be maintained.
//   - A bare ItemList does not make a leaderboard or a category page eligible
//     for a carousel; that's reserved for specific content types we aren't.
//   - Review / Product on pages carrying affiliate links is a policy risk
//     rather than free upside, and a review snippet needs visible rating data
//     we don't publish.
//
// Breadcrumbs are supported, cheap, and honest about what the page is. If that
// guidance changes, this is the one place to change it.

/** Escape for both attribute values and text nodes. Company names, broker
 *  names and editorial copy all reach these strings — escape rather than
 *  trust. */
export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** www.ddbx.uk -> ddbx.uk. Each www host shares its apex host's URL set. */
export function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

/** Rewrite an existing <meta content="…"> in place. */
export const setContent = (value) => ({
  element(el) {
    el.setAttribute("content", value);
  },
});

/** BreadcrumbList JSON-LD from [{name, item}] in order, root first.
 *
 *  The `<` escape matters: without it a company or broker name containing one
 *  could close the script element early. */
export function breadcrumbLd(crumbs) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.item ? { item: c.item } : {}),
    })),
  }).replace(/</g, "\\u003c");
}

/** The <head> tags every pre-rendered page sets, as one HTML string.
 *
 *  Kept as an append rather than individual rewrites for the tags the shell
 *  doesn't already carry — HTMLRewriter can only set attributes on elements
 *  that exist, and index.html has no canonical or twitter:* to overwrite. */
export function headTags({ canonical, title, description, breadcrumbs }) {
  return [
    `<link rel="canonical" href="${esc(canonical)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    `<meta property="og:site_name" content="ddbx">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    breadcrumbs
      ? `<script type="application/ld+json">${breadcrumbLd(breadcrumbs)}</script>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Apply the standard head rewrite plus a body injection to the SPA shell.
 *
 *  React replaces `body` the moment it mounts, so users see the real page and
 *  non-JS crawlers see the content. Same URL, same facts, no user-agent
 *  sniffing — the property that makes this pre-render honest rather than
 *  cloaking. */
export function renderInto(shell, { title, description, canonical, breadcrumbs, body }) {
  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(title);
      },
    })
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(description))
    .on("head", {
      element(el) {
        el.append(headTags({ canonical, title, description, breadcrumbs }), {
          html: true,
        });
      },
    })
    .on("#root", {
      element(el) {
        el.setInnerContent(body, { html: true });
      },
    })
    .transform(shell);
}

/** Shell with nothing but a noindex added.
 *
 *  For a URL that resolves to no content — an unknown slug, or an API we
 *  couldn't reach. The SPA still renders its own empty state; this just stops
 *  a bare shell being indexed. `follow` rather than `nofollow`: the page's
 *  links are still worth crawling. */
export function noindex(shell) {
  return new HTMLRewriter()
    .on("head", {
      element(el) {
        el.append('<meta name="robots" content="noindex, follow">', {
          html: true,
        });
      },
    })
    .transform(shell);
}

/** Fetch JSON with the cache posture every one of these Functions wants.
 *
 *  cacheTtlByStatus rather than a blanket cacheTtl: `cacheEverything` with a
 *  flat TTL pins whatever came back — including a 404 served during a Worker
 *  deploy — for the full duration. Errors get a minute so a blip can't hide the
 *  data for an hour. Returns null rather than throwing; a pre-render failing
 *  should cost the injected content, not the page. */
export async function fetchJson(url, ttl = 1800) {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": ttl, "400-499": 60, "500-599": 0 },
      },
    });

    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Wrapper for injected markup. No classes — React owns real presentation;
 *  these inline styles only keep the pre-hydration view legible on a slow
 *  connection. Matches functions/company/[key].js.
 *
 *  The `id="prerender"` is what index.html's inline stylesheet hides from any
 *  browser that runs JS (`html.js #prerender { display: none }`). Without it
 *  this markup paints and then gets wiped when React mounts — on /companies
 *  that is a 575-item list flashing up in #1E1506 ink, which on the dark theme
 *  is near-invisible dark-on-dark, before the real page arrives. With it, first
 *  paint is the page ground and then the route's own skeleton.
 *
 *  Every renderInto() family reaches the DOM through here, including the four
 *  filing pre-renders that go via shared/filing-prerender.js — so the id, and
 *  the fix, are one line rather than 27.
 *
 *  Not cloaking: no user-agent sniffing anywhere in this path. Googlebot runs
 *  JS and so receives the React page, identical to today's post-mount state and
 *  reached sooner. A crawler that doesn't run JS never gets the `js` class, so
 *  the rule never applies and it still reads the full link list. */
export function page(inner) {
  return `<div id="prerender" style="max-width:900px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1E1506">${inner}</div>`;
}
