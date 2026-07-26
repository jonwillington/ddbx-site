import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { seoForPath } from "../../shared/seo.js";

import { siteConfig } from "@/config/site";
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
  const { pathname, search, hash } = useLocation();

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

    window.gtag?.("event", "page_view", {
      page_title: pageTitle,
      page_path: `${pathname}${search}${hash}`,
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
