import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { seoForPath } from "../../shared/seo.js";

import { siteConfig } from "@/config/site";
import { withoutLinkerParam } from "@/lib/linker-param";
import { marketForPath } from "@/lib/markets/registry";

// `window.gtag` is declared in src/lib/cookie-consent.ts; it's only defined
// after the user accepts the cookie banner, so the optional-chained calls
// below are no-ops until then.

/** Keeps `document.title` in sync with the route (SPA).
 *
 *  The title and description themselves come from shared/seo.js, which
 *  functions/_middleware.js also renders into the HTML shell at the edge. That
 *  edge pass is what crawlers read; this one is what a user seeing the tab
 *  change on a client-side navigation reads. One table, so they agree. */
export function DocumentTitle() {
  const { pathname, search: rawSearch, hash } = useLocation();
  // Google's `_gl` is stripped before the query string is used for anything:
  // it has no business in og:url or twitter:url, and in page_location it makes
  // every cross-domain arrival its own row in the landing-page report, since
  // the value is unique per session. Doing it here also means LinkerParamCleanup
  // taking the parameter out of the URL is not a query-string change as far as
  // this effect is concerned, so it doesn't fire a second page_view for the
  // page we just counted. See lib/linker-param.ts.
  const search = withoutLinkerParam(rawSearch);

  useEffect(() => {
    const market = marketForPath(pathname);
    const { title: pageTitle, description: pageDescription } = seoForPath(
      pathname,
      window.location.hostname,
    );
    const pageUrl = `${window.location.origin}${pathname}${search}${hash}`;

    document.title = pageTitle;
    setMeta("name", "description", pageDescription);
    setMeta("property", "og:title", pageTitle);
    setMeta("property", "og:description", pageDescription);
    setMeta("property", "og:url", pageUrl);
    // Brand, not the descriptive name — matches what _middleware.js renders
    // for crawlers and what functions/t/[id].js sets on share links.
    setMeta("property", "og:site_name", siteConfig.brand);
    setMeta("name", "twitter:title", pageTitle);
    setMeta("name", "twitter:description", pageDescription);
    setMeta("name", "twitter:url", pageUrl);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:site", "@ddbxuk");

    // page_location ONLY — no page_path.
    //
    // page_path is a Universal Analytics field. GA4 derives its own page
    // path and query string from page_location, and supplying both makes it
    // concatenate the two query strings: /?theme=light became
    // /?theme=light?theme=light in reporting, /?ref=producthunt became
    // /?ref=producthunt?ref=producthunt, and every ?twclid= landing from X
    // doubled the same way. URLs with no query string were unaffected, which
    // is what identified the cause.
    //
    // The damage was worst exactly where it mattered least tolerably: the
    // parameters that carry attribution (twclid, ref, utm_*) are the ones
    // that made a URL doubled and therefore unreadable in landing-page
    // reports. See investigations/2026-09-04-organic-visibility.md §4 in
    // ddbx-data.
    window.gtag?.("event", "page_view", {
      page_title: pageTitle,
      page_location: pageUrl,
      host: window.location.hostname,
      market: market.id,
    });
  }, [pathname, search, hash]);

  return null;
}

function setMeta(
  key: "name" | "property",
  value: string,
  content: string,
): void {
  const selector = `meta[${key}="${value}"]`;
  const existing = document.head.querySelector(selector);

  if (existing instanceof HTMLMetaElement) {
    existing.setAttribute("content", content);

    return;
  }
  const tag = document.createElement("meta");

  tag.setAttribute(key, value);
  tag.setAttribute("content", content);
  document.head.appendChild(tag);
}
