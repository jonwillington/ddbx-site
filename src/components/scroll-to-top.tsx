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
 *  - **POP** (back / forward) puts the reader back where they were on that
 *    entry. This used to be left to the browser, which restores once, at the
 *    moment of the popstate, against whatever height the page has then. A
 *    list that renders from data a beat later is still short at that moment,
 *    so the browser clamped to the top — invisible while a deal opened in a
 *    drawer over the list, and the first thing anyone noticed once rows
 *    opened the filing page instead (2026-09-19). So restoration is manual:
 *    every entry's offset is recorded as the reader scrolls, and on POP it is
 *    re-applied each frame until the page is tall enough to hold it, the
 *    reader scrolls for themselves, or a second has passed.
 *  - **A hash** scrolls to that element instead, so in-page anchors keep
 *    working. `/api` links to `#reference` and `#request-access`, and a blanket
 *    scroll-to-top would break both.
 *
 *  Search-only changes (`?view=signal`, a filter) are deliberately NOT a
 *  navigation for this purpose: the effect keys on `pathname` alone, so
 *  toggling a filter leaves the reader looking at the rows they were reading.
 *
 *  `instant`, not smooth: this is a page change, not a movement within a page,
 *  and animating it makes the new page appear to arrive already scrolled.
 */
import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** Scroll offset per history entry, keyed by the router's location key. Held
 *  in sessionStorage so it survives a reload, like the browser's own. */
const STORE = "ddbx.scroll";
const RESTORE_MS = 1000;

function readOffsets(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORE) ?? "{}");
  } catch {
    return {};
  }
}

function writeOffset(key: string, y: number) {
  try {
    const all = readOffsets();

    all[key] = y;
    sessionStorage.setItem(STORE, JSON.stringify(all));
  } catch {
    // Private mode or full storage: restoration degrades to the top.
  }
}

export function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();

  // Take restoration off the browser, which would otherwise race the manual
  // restore below and win with a clamped offset.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  // Record this entry's offset as the reader scrolls, throttled to a frame.
  // A new entry (a link, a filter pushed into the URL) is stamped with where
  // it starts, so coming back to one never scrolled still has a record. Not
  // on POP: that entry's record is the one about to be restored.
  useEffect(() => {
    if (navigationType !== "POP") writeOffset(key, window.scrollY);
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        writeOffset(key, window.scrollY);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [key, navigationType]);

  // Back / forward: restore this entry's offset. Keyed on the entry, so a
  // search-only POP (Back closing an overlay) lands where it was too.
  useEffect(() => {
    if (navigationType !== "POP") return;

    // An entry never scrolled has no record, and its offset was the top.
    const target = readOffsets()[key] ?? 0;
    const started = performance.now();
    let raf = 0;
    let cancelled = false;
    // The reader taking over ends it: never yank a page they are scrolling.
    const stop = () => {
      cancelled = true;
    };
    const tick = () => {
      if (cancelled) return;
      const room = document.documentElement.scrollHeight - window.innerHeight;

      window.scrollTo({
        top: Math.min(target, Math.max(0, room)),
        left: 0,
        behavior: "instant" as ScrollBehavior,
      });
      if (room >= target || performance.now() - started > RESTORE_MS) {
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchstart", stop, { passive: true, once: true });
    window.addEventListener("keydown", stop, { once: true });
    tick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [key, navigationType]);

  useEffect(() => {
    if (navigationType === "POP") return;

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
  }, [pathname, hash, navigationType]);

  return null;
}
