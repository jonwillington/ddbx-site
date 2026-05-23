import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { siteConfig } from "@/config/site";
import { marketForPath } from "@/lib/markets/registry";

// `window.gtag` is declared in src/lib/cookie-consent.ts; it's only defined
// after the user accepts the cookie banner, so the optional-chained calls
// below are no-ops until then.

/** Keeps `document.title` in sync with the route (SPA). Per-market title
 *  comes from MarketConfig.documentTitle; Portfolio / Director pages get
 *  their own treatment because they're cross-market in their final form. */
export function DocumentTitle() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const market = marketForPath(pathname);

    if (pathname === "/portfolio" || pathname.endsWith("/performance")) {
      document.title = `${siteConfig.brand} · Portfolio (${market.label}) — ${siteConfig.name}`;
    } else if (
      pathname.startsWith("/directors/") ||
      /\/directors\//.test(pathname)
    ) {
      document.title = `${siteConfig.brand} · Director (${market.label}) — ${siteConfig.name}`;
    } else {
      document.title = market.config.documentTitle;
    }

    window.gtag?.("event", "page_view", {
      page_title: document.title,
      page_path: `${pathname}${search}${hash}`,
      page_location: window.location.href,
      host: window.location.hostname,
      market: market.id,
    });
  }, [pathname, search, hash]);

  return null;
}
