/** Reset the scroll position when a navigation changes the page.
 *
 *  `BrowserRouter` does not do this. The DOM is swapped underneath a scroll
 *  offset the browser has no reason to touch, so following a link from halfway
 *  down a long page — a filing row on a company page, a member in the Congress
 *  directory — dropped the reader into the middle of the new document with no
 *  indication that anything above it existed. Worst on exactly the pages this
 *  site has most of: long ruled lists.
 *
 *  Three behaviours, and the distinctions matter:
 *
 *  - **PUSH / REPLACE** (a link, a redirect) scrolls to the top. This is the
 *    fix.
 *  - **POP** after the app has mounted (back / forward) puts the reader back
 *    where they were on that entry. React Router also labels every initial
 *    document load POP, so the browser's navigation timing distinguishes a
 *    real cross-document back/forward from a fresh navigation or reload.
 *    This used to be left to the browser, which restores once, at the
 *    moment of the popstate, against whatever height the page has then. A
 *    list that renders from data a beat later is still short at that moment,
 *    so the browser clamped to the top — invisible while a deal opened in a
 *    drawer over the list, and the first thing anyone noticed once rows
 *    opened the filing page instead (2026-09-19). So restoration is manual:
 *    every entry's offset is recorded as the reader scrolls, WITH the page
 *    height at the time, and on POP the offset is re-applied every frame
 *    until the page is back to that height. Re-applying rather than applying
 *    once matters: sections that load in above the fold grow the page, and
 *    the browser's scroll anchoring would otherwise carry the view thousands
 *    of pixels past the row the reader left (measured: 1754 → 7033). It
 *    stops when the height is reached, the reader scrolls for themselves, or
 *    2.5s have passed.
 *  - **A hash** scrolls to that element instead, so in-page anchors keep
 *    working. `/api` links to `#reference` and `#request-access`, and a blanket
 *    scroll-to-top would break both.
 *
 *  Search-only changes (`?view=signal`, a filter) are deliberately NOT a
 *  navigation for this purpose: the effect keys on `pathname` alone, so
 *  toggling a filter leaves the reader looking at the rows they were reading.
 *
 *  The inline head script sets `history.scrollRestoration = "manual"` before
 *  first paint. Doing it here in an effect is too late for a full document
 *  navigation: the browser may already have restored the old document's
 *  offset before React starts.
 *
 *  `instant`, not smooth: this is a page change, not a movement within a page,
 *  and animating it makes the new page appear to arrive already scrolled.
 */
import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** Scroll offset per history entry. SPA entries use the router's location key;
 *  document-loaded entries use the durable id installed by index.html because
 *  BrowserRouter calls every one of those "default". Held in sessionStorage
 *  so it survives a reload, like the browser's own. */
const STORE = "ddbx.scroll";
const RESTORE_MS = 2500;

/** True while a POP restore is re-applying an offset: the scrolls it causes
 *  are its own, against a page still loading, and must not overwrite the
 *  record they are restoring. */
let restoring = false;

/** Where the entry was scrolled to, and how tall the page was then. */
interface Offset {
  y: number;
  h: number;
  url: string;
}

function readOffsets(): Record<string, Offset> {
  try {
    return JSON.parse(sessionStorage.getItem(STORE) ?? "{}");
  } catch {
    return {};
  }
}

function writeOffset(key: string, url: string, y: number) {
  try {
    const all = readOffsets();

    all[key] = { y, h: document.documentElement.scrollHeight, url };
    sessionStorage.setItem(STORE, JSON.stringify(all));
  } catch {
    // Private mode or full storage: restoration degrades to the top.
  }
}

function scrollEntryKey(routerKey: string, url: string): string {
  const state = history.state as { ddbxScrollKey?: unknown } | null;

  if (routerKey === "default" && typeof state?.ddbxScrollKey === "string") {
    return state.ddbxScrollKey;
  }

  // The path-qualified fallback covers unusual shells where the inline script
  // was removed or blocked. It cannot distinguish two visits to the same URL,
  // but it still prevents unrelated pages from sharing an offset.
  return routerKey === "default" ? `default:${url}` : routerKey;
}

export function ScrollToTop() {
  const { pathname, search, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const firstRenderRef = useRef(true);
  const pageTargetRef = useRef<string | null>(null);
  const isInitialRender = firstRenderRef.current;
  const url = `${pathname}${search}${hash}`;
  const entryKey = scrollEntryKey(key, url);
  const documentNavigationType = (
    performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined
  )?.type;
  const shouldRestore =
    navigationType === "POP" &&
    (!isInitialRender || documentNavigationType === "back_forward");

  // Capturing the render-time value above matters in Strict Mode: React runs
  // the first render's effects twice, but both runs must still be classified
  // as the initial document load.
  useEffect(() => {
    firstRenderRef.current = false;
  }, []);

  // Defence in depth for documents whose inline head script did not run. The
  // head owns the timing-critical assignment; this keeps the invariant true.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  // Record this entry's offset as the reader scrolls, throttled to a frame.
  // A new entry (a link, a filter pushed into the URL) is stamped with where
  // it starts, so coming back to one never scrolled still has a record. Not
  // on POP: that entry's record is the one about to be restored.
  useEffect(() => {
    if (!shouldRestore && !restoring) {
      writeOffset(entryKey, url, window.scrollY);
    }
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!restoring) writeOffset(entryKey, url, window.scrollY);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [entryKey, shouldRestore, url]);

  // Back / forward: restore this entry's offset. Keyed on the entry, so a
  // search-only POP (Back closing an overlay) lands where it was too.
  useEffect(() => {
    if (!shouldRestore) return;

    // An entry never scrolled has no record, and its offset was the top.
    const candidate = readOffsets()[entryKey];
    // BrowserRouter calls every initial document entry "default". Guarding
    // the URL prevents one hard-loaded page from inheriting another page's
    // offset through that shared key. Records written before this guard have
    // no URL and safely degrade to the top.
    const saved =
      typeof candidate === "object" && candidate?.url === url
        ? candidate
        : undefined;
    const target = saved?.y ?? 0;
    // Within a couple of percent: a live list can gain or lose a row.
    const height = saved ? saved.h * 0.98 : 0;
    const started = performance.now();
    let raf = 0;
    let cancelled = false;
    // The reader taking over ends it: never yank a page they are scrolling.
    const stop = () => {
      cancelled = true;
      restoring = false;
    };
    const tick = () => {
      if (cancelled) return;
      const room = document.documentElement.scrollHeight - window.innerHeight;

      window.scrollTo({
        top: Math.min(target, Math.max(0, room)),
        left: 0,
        behavior: "instant" as ScrollBehavior,
      });
      const settled =
        room >= target && document.documentElement.scrollHeight >= height;

      if (settled || performance.now() - started > RESTORE_MS) {
        restoring = false;

        return;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchstart", stop, { passive: true, once: true });
    window.addEventListener("keydown", stop, { once: true });
    restoring = true;
    tick();

    return () => {
      cancelled = true;
      restoring = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [entryKey, shouldRestore, url]);

  useEffect(() => {
    const pageTarget = `${pathname}${hash}`;
    const targetChanged = pageTargetRef.current !== pageTarget;

    pageTargetRef.current = pageTarget;

    if (shouldRestore) return;
    // Query-only entries drive overlays and filters. They are new history
    // entries, but not new documents from the reader's point of view.
    if (!isInitialRender && !targetChanged) return;

    if (hash) {
      // The target may not be mounted on the first paint after a route change,
      // so try once now and once on the next frame before giving up. Anything
      // slower than that is data-dependent and belongs to the page itself.
      const jump = () => {
        const el = document.querySelector(hash);

        if (el) {
          el.scrollIntoView();

          return true;
        }

        return false;
      };

      if (jump()) return;
      const raf = requestAnimationFrame(() => {
        jump();
      });

      return () => cancelAnimationFrame(raf);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash, isInitialRender, shouldRestore]);

  return null;
}
