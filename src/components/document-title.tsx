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
    const pageTitle = (() => {
      if (pathname === "/portfolio" || pathname.endsWith("/performance")) {
        return `${siteConfig.brand} · Portfolio (${market.label}) — ${siteConfig.name}`;
      }
      if (pathname.startsWith("/directors/") || /\/directors\//.test(pathname)) {
        return `${siteConfig.brand} · Director (${market.label}) — ${siteConfig.name}`;
      }
      if (pathname === "/compare" || pathname.startsWith("/brokers")) {
        return `Compare UK trading platforms — fees, ISAs & SIPPs — ${siteConfig.name}`;
      }
      // App-install landing pages (/download, /us/download) — conversion copy,
      // distinct from the generic market-listing homepage title.
      if (pathname.endsWith("/download")) {
        return market.id === "us"
          ? `Get ddbx — follow US insider stock buys · 7-day free trial`
          : `Get ddbx — follow UK director share buys · 7-day free trial`;
      }

      return market.config.documentTitle;
    })();
    const pageDescription = (() => {
      const specific = (() => {
        if (pathname === "/portfolio" || pathname.endsWith("/performance")) {
          return `Track ${market.label} insider performance versus benchmark indices on ddbx.`;
        }
        if (
          pathname.startsWith("/directors/") ||
          /\/directors\//.test(pathname)
        ) {
          return `${market.label} director profile with dealing history and signal context on ddbx.`;
        }
        if (pathname === "/compare" || pathname.startsWith("/brokers")) {
          return "Compare the UK’s main trading and investing platforms side by side — fees, ISAs, SIPPs, fractional shares and FSCS protection.";
        }
        if (pathname.endsWith("/download")) {
          return market.id === "us"
            ? "See which US insiders are buying their own stock — with live performance tracking. Start your 7-day free trial on the ddbx iOS app."
            : "See which UK directors are buying shares in their own companies — with live performance tracking. Start your 7-day free trial on the ddbx iOS app.";
        }

        return `Analysed ${market.label} insider dealings and director transactions, updated throughout the trading day.`;
      })();

      return specific;
    })();
    const pageUrl = `${window.location.origin}${pathname}${search}${hash}`;

    document.title = pageTitle;
    setMeta("name", "description", pageDescription);
    setMeta("property", "og:title", pageTitle);
    setMeta("property", "og:description", pageDescription);
    setMeta("property", "og:url", pageUrl);
    setMeta("property", "og:site_name", siteConfig.name);
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
