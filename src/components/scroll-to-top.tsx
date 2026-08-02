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
 *  - **POP** (back / forward) does nothing, leaving the browser's own
 *    restoration to put the reader back where they were. Overriding it would
 *    trade one wrong position for a more annoying one: going back to a list and
 *    losing your place in it.
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

export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

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
