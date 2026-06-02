import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/** Back an overlay's open state with a URL query param so it deep-links,
 *  survives refresh and the back button, and is tracked in GA for free —
 *  `DocumentTitle` already fires a `page_view` whenever the query string
 *  changes (see src/components/document-title.tsx), so the param appearing in
 *  `page_path` is the whole tracking story. No new routes needed.
 *
 *  The param is the single source of truth: reading returns the current value
 *  (or null when absent), setting null clears it. Other params are preserved,
 *  and updates push history entries so Back closes the overlay.
 */
export function useUrlParam(
  key: string,
): [string | null, (value: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key);

  const setValue = useCallback(
    (next: string | null) => {
      const clearing = next == null || next === "";

      setParams(
        (prev) => {
          const copy = new URLSearchParams(prev);

          if (clearing) copy.delete(key);
          else copy.set(key, next);

          return copy;
        },
        // Opening pushes an entry so Back closes the overlay; closing replaces
        // it so Back then lands on the pre-open page instead of re-opening.
        { replace: clearing },
      );
    },
    [key, setParams],
  );

  return [value, setValue];
}

/** Set several overlay params in one history entry. Use when a single action
 *  swaps overlays (e.g. closing the day sheet while opening a deal drawer) —
 *  two separate {@link useUrlParam} setters in the same tick both read the
 *  current render's params and race, dropping one of the changes. */
export function useSetUrlParams(): (
  updates: Record<string, string | null>,
) => void {
  const [, setParams] = useSearchParams();

  return useCallback(
    (updates) => {
      setParams((prev) => {
        const copy = new URLSearchParams(prev);

        for (const [k, v] of Object.entries(updates)) {
          if (v == null || v === "") copy.delete(k);
          else copy.set(k, v);
        }

        return copy;
      });
    },
    [setParams],
  );
}

/** Boolean variant for singleton overlays (e.g. the explainer sheet): open maps
 *  to `?key=onValue`, closed clears it. Built on {@link useUrlParam}. */
export function useUrlFlag(
  key: string,
  onValue = "1",
): [boolean, (open: boolean) => void] {
  const [value, setValue] = useUrlParam(key);

  const setOpen = useCallback(
    (open: boolean) => setValue(open ? onValue : null),
    [setValue, onValue],
  );

  return [value === onValue, setOpen];
}
