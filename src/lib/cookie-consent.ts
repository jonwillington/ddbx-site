// Analytics + cookie consent.
//
// GA4 loads unconditionally on app start (per-domain measurement ID) via
// `bootstrapAnalytics`, called from main.tsx — see that file. Page views are
// owned by DocumentTitle, which fires the initial view once `window.gtag` is
// defined and then one per SPA navigation. `config` uses `send_page_view:
// false` so gtag.js doesn't double-count.
//
// The cookie banner now gates only the X (Twitter) ads pixel, which loads on
// explicit acceptance.
//
// Toggle precedence (highest wins):
//   1. URL: `?cookies=reset` clears the saved choice (handy for testing).
//   2. localStorage: `ddbx.cookies.consent` ("accepted" or absent).

import { useEffect, useState } from "react";

import { marketForPath } from "@/lib/markets/registry";

const STORAGE_KEY = "ddbx.cookies.consent";
const EVENT_NAME = "ddbx:cookies:change";

const GA_IDS: Record<string, string> = {
  "ddbx.eu": "G-0R0DR69FXM",
  "www.ddbx.eu": "G-0R0DR69FXM",
  "ddbx.uk": "G-0TQE914NMD",
  "www.ddbx.uk": "G-0TQE914NMD",
  "ddbx.us": "G-0HHXDL7DE2",
  "www.ddbx.us": "G-0HHXDL7DE2",
};
const FALLBACK_GA_ID = "G-0TQE914NMD";

const TWITTER_PIXEL_ID = "rcklm";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    twq?: {
      (...args: unknown[]): void;
      exe?: (...args: unknown[]) => void;
      queue?: unknown[];
      version?: string;
    };
    __DDBX_GA_MEASUREMENT_ID?: string;
    __DDBX_GA_BOOTSTRAPPED?: boolean;
    __DDBX_TWQ_BOOTSTRAPPED?: boolean;
  }
}

type ConsentStatus = "accepted" | "unknown";

function readStored(): ConsentStatus {
  if (typeof window === "undefined") return "unknown";
  try {
    // ?cookies=reset clears the saved choice — useful for re-testing the banner.
    const url = new URLSearchParams(window.location.search).get("cookies");

    if (url === "reset") window.localStorage.removeItem(STORAGE_KEY);

    return window.localStorage.getItem(STORAGE_KEY) === "accepted"
      ? "accepted"
      : "unknown";
  } catch {
    return "unknown";
  }
}

export function bootstrapAnalytics(): void {
  if (typeof window === "undefined") return;
  if (window.__DDBX_GA_BOOTSTRAPPED) return;

  const host = (window.location.hostname || "").toLowerCase();
  const measurementId = GA_IDS[host] || FALLBACK_GA_ID;
  const market = marketForPath(window.location.pathname, host).id;

  window.__DDBX_GA_MEASUREMENT_ID = measurementId;
  window.__DDBX_GA_BOOTSTRAPPED = true;
  window.dataLayer = window.dataLayer || [];
  // gtag.js only processes dataLayer entries that are `arguments` objects as
  // commands — pushing a plain Array (e.g. via rest params) is silently
  // ignored, so GA never initialises. Use the canonical `arguments` form.
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });
  window.gtag("set", "user_properties", { market, host });
  // The initial page_view is fired by DocumentTitle's mount effect (gtag is
  // defined by the time React mounts, since this runs at module load), so we
  // don't fire one here — doing so would double-count the landing page.

  const script = document.createElement("script");

  script.async = true;
  script.src =
    "https://www.googletagmanager.com/gtag/js?id=" +
    encodeURIComponent(measurementId);
  document.head.appendChild(script);
}

// X (Twitter) Ads conversion-tracking base pixel. Mirrors the official
// snippet: stub `twq` with a queue, async-load uwt.js, then `config`.
function bootstrapTwitterPixel(): void {
  if (typeof window === "undefined") return;
  if (window.__DDBX_TWQ_BOOTSTRAPPED) return;
  window.__DDBX_TWQ_BOOTSTRAPPED = true;

  if (!window.twq) {
    const stub = function twq(...args: unknown[]) {
      if (stub.exe) stub.exe.apply(stub, args);
      else stub.queue!.push(args);
    } as Window["twq"] & object;

    stub.version = "1.1";
    stub.queue = [];
    window.twq = stub;

    const script = document.createElement("script");

    script.async = true;
    script.src = "https://static.ads-twitter.com/uwt.js";
    const first = document.getElementsByTagName("script")[0];

    first?.parentNode?.insertBefore(script, first);
  }
  window.twq!("config", TWITTER_PIXEL_ID);
}

export function acceptCookies(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "accepted");
  } catch {
    // localStorage unavailable — trackers will load this session but not stick.
  }
  bootstrapAnalytics();
  bootstrapTwitterPixel();
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export interface CookieConsent {
  needsConsent: boolean;
  accept: () => void;
}

export function useCookieConsent(): CookieConsent {
  const [status, setStatus] = useState<ConsentStatus>(() => readStored());

  // If consent was given on a previous visit, fire up trackers on mount.
  useEffect(() => {
    if (status !== "accepted") return;
    bootstrapAnalytics();
    bootstrapTwitterPixel();
  }, [status]);

  // Keep tabs / components in sync when the user accepts.
  useEffect(() => {
    const refresh = () => setStatus(readStored());

    window.addEventListener(EVENT_NAME, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(EVENT_NAME, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return {
    needsConsent: status !== "accepted",
    accept: () => {
      acceptCookies();
      setStatus("accepted");
    },
  };
}
