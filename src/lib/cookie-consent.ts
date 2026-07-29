// Analytics + cookie consent.
//
// GA4 loads on app start (per-domain measurement ID) via `bootstrapAnalytics`,
// called from main.tsx — but under Google Consent Mode v2 with
// `analytics_storage` DENIED by default: no GA cookies are set and pings are
// cookieless until the visitor accepts the banner, at which point consent is
// upgraded. This is what makes the Cookie Policy's "no cookies until you
// agree" claim true — the previous arrangement loaded GA4 unconditionally
// with storage on, which contradicted the policy (and PECR). If you change
// the consent flow, change the policy copy in layouts/default.tsx in the
// same commit; the two are one claim.
//
// Page views are owned by DocumentTitle, which fires the initial view once
// `window.gtag` is defined and then one per SPA navigation. `config` uses
// `send_page_view: false` so gtag.js doesn't double-count.
//
// The X (Twitter) ads pixel stays fully gated: it only loads on explicit
// acceptance.
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
    __DDBX_GA_CLICK_TRACKING_BOOTSTRAPPED?: boolean;
    __DDBX_TWQ_BOOTSTRAPPED?: boolean;
  }
}

type ConsentStatus = "accepted" | "unknown";

const CLICK_TARGET_SELECTOR =
  "[data-ga-event],a[href],button,summary,[role='button'],input[type='button'],input[type='submit']";

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
  // Consent Mode v2 defaults MUST precede config. Denied = cookieless pings
  // only; acceptCookies() upgrades analytics_storage. Ad signals stay denied
  // permanently — we run no Google ads products.
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: readStored() === "accepted" ? "granted" : "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });
  window.gtag("set", "user_properties", { market, host });
  bootstrapClickTracking();
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

/** Global delegated click tracking for GA4.
 *  Every actionable click emits a named event. Use `data-ga-event` to override
 *  the event name and `data-ga-label` to override the label on any element. */
function bootstrapClickTracking(): void {
  if (typeof window === "undefined") return;
  if (window.__DDBX_GA_CLICK_TRACKING_BOOTSTRAPPED) return;
  window.__DDBX_GA_CLICK_TRACKING_BOOTSTRAPPED = true;

  document.addEventListener(
    "click",
    (e) => {
      const origin = e.target;

      if (!(origin instanceof Element)) return;
      const target = origin.closest(CLICK_TARGET_SELECTOR);

      if (!(target instanceof HTMLElement)) return;

      const eventName = inferEventName(target);
      const eventLabel = inferEventLabel(target);
      const destination =
        target instanceof HTMLAnchorElement ? target.href : undefined;
      const pagePath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      window.gtag?.("event", eventName, {
        event_category: "engagement",
        event_label: eventLabel,
        page_path: pagePath,
        click_type: target.tagName.toLowerCase(),
        destination,
      });

      // …plus one shared event for the thing the whole site is for.
      //
      // Store click-throughs are spread across ~15 named events —
      // cta_download_lp, cta_nav_download_app, cta_floating_trial,
      // cta_footer_download, cta_company_download, cta_unlock_download, the
      // per-surface unlock CTAs, and so on. Each is genuinely useful for
      // attribution, and together they make the one number that matters
      // ("how many people did we send to a store listing?") impossible to
      // read without enumerating the list by hand — and any CTA added later
      // is silently missing from every report built that way.
      //
      // So the aggregate is derived from where the click actually WENT rather
      // than from what it was called. Nothing to remember to tag, and it
      // stays correct for CTAs that don't exist yet. The specific event still
      // fires alongside it; this is in addition, never instead.
      //
      // The one thing "where it went" can't see: an anchor whose store href is
      // real but whose click is intercepted — the desktop app-handoff modal
      // (components/app-handoff-modal.tsx) keeps the store URL for
      // open-in-new-tab and crawlers, then preventDefaults and opens a modal.
      // This listener is capture-phase, so it runs BEFORE React's handler and
      // `defaultPrevented` is still false here; the interception has to be
      // declared up front rather than observed. Those anchors carry
      // `data-ga-store-intercepted`, and the real store click is counted from
      // the badges inside the modal instead.
      const intercepted = target.dataset.gaStoreIntercepted === "true";

      if (destination && !intercepted && isStoreUrl(destination)) {
        window.gtag?.("event", "store_click", {
          event_category: "conversion",
          event_label: eventLabel,
          page_path: pagePath,
          // Which CTA it came from, so the aggregate can still be split.
          source_event: eventName,
          store: destination.includes("play.google.com")
            ? "google_play"
            : "app_store",
          destination,
        });
      }
    },
    true,
  );
}

/** An App Store or Google Play listing — the two destinations that count as
 *  "we sent someone to install the app". */
function isStoreUrl(href: string): boolean {
  try {
    const host = new URL(href).hostname.toLowerCase();

    return (
      host === "apps.apple.com" ||
      host === "itunes.apple.com" ||
      host === "play.google.com"
    );
  } catch {
    return false;
  }
}

function inferEventName(el: HTMLElement): string {
  const explicit = sanitizeEventName(el.dataset.gaEvent);

  if (explicit) return explicit;
  if (el instanceof HTMLAnchorElement) return "click_link";
  if (el.tagName.toLowerCase() === "summary") return "click_disclosure";
  if (el.getAttribute("role") === "button") return "click_role_button";
  if (el instanceof HTMLInputElement) return "click_input_button";

  return "click_button";
}

function inferEventLabel(el: HTMLElement): string {
  const explicit = cleanLabel(el.dataset.gaLabel);

  if (explicit) return explicit;
  const aria = cleanLabel(el.getAttribute("aria-label"));

  if (aria) return aria;
  if (el instanceof HTMLAnchorElement) {
    const text = cleanLabel(el.textContent);

    return text || cleanLabel(el.pathname) || "link";
  }

  return cleanLabel(el.textContent) || el.tagName.toLowerCase();
}

function sanitizeEventName(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  if (!cleaned) return null;
  if (!/^[a-z]/.test(cleaned)) return `click_${cleaned}`.slice(0, 40);

  return cleaned;
}

function cleanLabel(value: string | null | undefined): string | undefined {
  const cleaned = value?.replace(/\s+/g, " ").trim();

  return cleaned ? cleaned.slice(0, 120) : undefined;
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
  // Already bootstrapped on app start with storage denied — flip it on.
  window.gtag?.("consent", "update", { analytics_storage: "granted" });
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
