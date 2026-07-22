// Tiny shared store so globally-mounted overlays (the cookie banner) know
// whether the current page reserves the fixed right rail (`lg:mr-80`).
// DefaultLayout writes it from its `drawerRight` prop; consumers subscribe via
// useSyncExternalStore. This replaces the old pathname-regex guess in
// cookie-banner.tsx, which drifted whenever a route gained or lost a rail.
import { useSyncExternalStore } from "react";

let railPresent = false;
const listeners = new Set<() => void>();

export function setRailPresent(value: boolean) {
  if (value === railPresent) return;
  railPresent = value;
  listeners.forEach((notify) => notify());
}

export function useRailPresent(): boolean {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);

      return () => listeners.delete(notify);
    },
    () => railPresent,
  );
}
