/** The state vocabulary for `/status`, in one place.
 *
 *  Four states, one colour each, one sentence each. Kept out of the components
 *  so the banner, the rows and the sparkline can't drift into describing the
 *  same reading with different words — which is the classic status-page bug
 *  where the header says "All systems operational" over a row marked degraded.
 *
 *  Colours come from the site's own directional tokens (`--positive`,
 *  `--negative`) plus `--risk` for the middle state. `--risk` is the warm amber
 *  the analysis pages already use for "a caveat to weigh, not a verdict
 *  against" — which is exactly what a slow-but-answering endpoint is. No new
 *  emerald/amber literals: see the note at the top of chip.ts.
 */
import type { OverallState, ProbeState } from "@/lib/status";

export const STATE_TEXT: Record<OverallState, string> = {
  operational: "text-positive",
  degraded: "text-risk",
  down: "text-negative",
  checking: "text-foreground/40",
};

export const STATE_DOT: Record<OverallState, string> = {
  operational: "bg-positive",
  degraded: "bg-risk",
  down: "bg-negative",
  checking: "bg-foreground/30",
};

/** Row-level label. Terse by design: it sits in a column, not a sentence. */
export const STATE_LABEL: Record<OverallState, string> = {
  operational: "Operational",
  degraded: "Slow",
  down: "Not responding",
  checking: "Checking",
};

/** The banner's headline. Says the same thing as STATE_LABEL, at the volume a
 *  page-level verdict needs. */
export const BANNER_HEADLINE: Record<OverallState, string> = {
  operational: "All systems operational",
  degraded: "Degraded performance",
  down: "Service disruption",
  checking: "Checking services",
};

/** The banner's second line. Written to be true of what was actually measured
 *  — note that none of these claim anything about a window we didn't observe. */
export const BANNER_BODY: Record<OverallState, string> = {
  operational: "Every endpoint answered on the last check.",
  degraded:
    "Every endpoint answered, but at least one was slower than usual. Data is current; requests may take longer than normal.",
  down: "At least one endpoint did not answer on the last check. Parts of the site and the apps may be missing data.",
  checking: "Running checks against the public API.",
};

/** Both sparkline and latency meter fill from this. */
export const STATE_FILL: Record<ProbeState, string> = {
  operational: "bg-positive",
  degraded: "bg-risk",
  down: "bg-negative",
};
