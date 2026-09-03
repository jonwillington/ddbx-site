/** Suppression counter for the layout's floating mobile "Start your free
 *  trial" button.
 *
 *  Some surfaces carry their own app ask (the winners list's mid-list
 *  interstitial, with its live notification stack). When one of those is on
 *  screen the pinned button underneath it is a second identical ask in the
 *  same viewport, so the surface registers itself here while visible and the
 *  layout slides the button away until it scrolls off again.
 *
 *  A counter rather than a boolean so two overlapping suppressors can't
 *  release each other early. Module-level store + useSyncExternalStore keeps
 *  it prop-free: the layout is several component boundaries above the pages
 *  that need it.
 */
import { useEffect, useSyncExternalStore } from "react";

let count = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  listeners.forEach((l) => l());
}

/** Hold the floating CTA away while `active` is true. */
export function useSuppressFloatingCta(active: boolean) {
  useEffect(() => {
    if (!active) return;
    count += 1;
    emit();

    return () => {
      count -= 1;
      emit();
    };
  }, [active]);
}

/** True while any surface is holding the floating CTA away. */
export function useFloatingCtaSuppressed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => count > 0,
    () => false,
  );
}
