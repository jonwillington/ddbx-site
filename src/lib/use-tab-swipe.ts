/** Horizontal-swipe handlers for a segmented pair of panes.
 *
 *  A pill toggle on a phone reads as a native segmented control, and the
 *  pane under a native segmented control swipes. Returns touch handlers to
 *  spread onto each pane: a decisive leftward drag calls `onLeft` (advance to
 *  the pane on the right), a rightward one `onRight`.
 *
 *  Deliberately strict about what counts, because the panes scroll
 *  vertically and may contain horizontal scrollers of their own: the drag
 *  has to be mostly horizontal and at least `threshold` px, and anything
 *  that started inside an element that scrolls sideways is left to that
 *  element. Touch-only — there is no mouse equivalent to offer, and the tabs
 *  are still there.
 */
import type { TouchEvent } from "react";

import { useRef } from "react";

const THRESHOLD_PX = 56;

export function useTabSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

  return {
    onTouchStart(e: TouchEvent) {
      const t = e.touches[0];

      if (!t) return;
      // Started inside a sideways scroller (a chip rail, a chart)? Leave the
      // gesture to it.
      let ignore = false;
      let el = e.target as HTMLElement | null;

      while (el && el !== e.currentTarget) {
        if (el.scrollWidth > el.clientWidth + 1) {
          const ox = getComputedStyle(el).overflowX;

          if (ox === "auto" || ox === "scroll") {
            ignore = true;
            break;
          }
        }
        el = el.parentElement;
      }
      start.current = { x: t.clientX, y: t.clientY, ignore };
    },
    onTouchEnd(e: TouchEvent) {
      const s = start.current;

      start.current = null;
      const t = e.changedTouches[0];

      if (!s || s.ignore || !t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;

      if (Math.abs(dx) < THRESHOLD_PX || Math.abs(dy) > Math.abs(dx) * 0.6) {
        return;
      }
      if (dx < 0) onLeft();
      else onRight();
    },
  };
}
