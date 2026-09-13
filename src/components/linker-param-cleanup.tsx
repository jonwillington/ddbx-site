import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { onAnalyticsSettled } from "@/lib/cookie-consent";
import { LINKER_PARAM } from "@/lib/linker-param";

/** Takes Google's `_gl` cross-domain parameter back out of the address bar
 *  once gtag.js has read it. See `src/lib/linker-param.ts` for what it is and
 *  why it should not outlive its one use.
 *
 *  Two things make this fiddlier than a `history.replaceState`:
 *
 *  - **It has to go through the router.** `useUrlParam` (lib/use-url-overlay.ts)
 *    drives every deep-linked overlay off `useSearchParams`. Rewriting the URL
 *    behind React Router's back leaves its own location still holding `_gl`,
 *    and the next drawer the reader opens writes the parameter straight back.
 *  - **It must not be a second page_view.** `DocumentTitle` fires one whenever
 *    the query string changes, so a naive strip double-counts the landing page
 *    — on exactly the cross-domain arrivals the linker exists to measure. It
 *    doesn't, because DocumentTitle keys on the query string with `_gl`
 *    already normalised out; the two are one arrangement.
 *
 *  `replace`, not push, so Back doesn't return the reader to the litter. */
export function LinkerParamCleanup() {
  const [params, setParams] = useSearchParams();
  const present = params.has(LINKER_PARAM);

  useEffect(() => {
    if (!present) return;

    return onAnalyticsSettled(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          next.delete(LINKER_PARAM);

          return next;
        },
        { replace: true },
      );
    });
  }, [present, setParams]);

  return null;
}
