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
    // App-install landing pages: /download plus the forced-platform variants
    // /download/ios and /download/android (and their /us equivalents). The
    // platform is part of the title and description because these are the URLs
    // store-specific ad campaigns and "ddbx android app" searches land on — a
    // shared title across all three would have them competing with each other.
    const downloadPlatform: "ios" | "android" | null = /\/download\/ios$/.test(
      pathname,
    )
      ? "ios"
      : /\/download\/android$/.test(pathname)
        ? "android"
        : null;
    const isDownload =
      pathname.endsWith("/download") || downloadPlatform !== null;
    const deviceNoun =
      downloadPlatform === "android"
        ? "Android"
        : downloadPlatform === "ios"
          ? "iPhone"
          : null;
    const pageTitle = (() => {
      if (pathname === "/portfolio" || pathname.endsWith("/performance")) {
        return `${siteConfig.brand} · Portfolio (${market.label}) — ${siteConfig.name}`;
      }
      if (
        pathname.startsWith("/directors/") ||
        /\/directors\//.test(pathname)
      ) {
        return `${siteConfig.brand} · Director (${market.label}) — ${siteConfig.name}`;
      }
      if (pathname.startsWith("/brokers/")) {
        const broker = titleCase(
          pathname.split("/").filter(Boolean).at(-1) ?? "",
        );

        return `${broker} review — fees, accounts & verdict — ${siteConfig.name}`;
      }
      if (pathname === "/compare" || pathname === "/brokers") {
        return `Compare UK trading platforms — fees, ISAs & SIPPs — ${siteConfig.name}`;
      }
      // App-install landing pages — conversion copy, distinct from the generic
      // market-listing homepage title.
      if (isDownload) {
        const on = deviceNoun ? ` for ${deviceNoun}` : "";

        return market.id === "us"
          ? `Get ddbx${on} — follow US insider stock buys · 7-day free trial`
          : `Get ddbx${on} — follow UK director share buys · 7-day free trial`;
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
        if (pathname.startsWith("/brokers/")) {
          const broker = titleCase(
            pathname.split("/").filter(Boolean).at(-1) ?? "",
          );

          return `${broker} review: our verdict on its fees, ISA and SIPP accounts, investment range, features and FSCS protection.`;
        }
        if (pathname === "/compare" || pathname === "/brokers") {
          return "Compare the UK’s main trading and investing platforms side by side — fees, ISAs, SIPPs, fractional shares and FSCS protection.";
        }
        if (isDownload) {
          const app =
            deviceNoun === "Android"
              ? "the ddbx Android app"
              : deviceNoun === "iPhone"
                ? "the ddbx iPhone app"
                : "the ddbx app";

          return market.id === "us"
            ? `See which US insiders are buying their own stock — with live performance tracking. Start your 7-day free trial on ${app}.`
            : `See which UK directors are buying shares in their own companies — with live performance tracking. Start your 7-day free trial on ${app}.`;
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

function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
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
