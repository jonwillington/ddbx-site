/** One endpoint's row.
 *
 *  Carries four facts, in falling order of how much a reader cares: is it up,
 *  how fast did it answer, how current is the data behind it, and what is it
 *  for. The last one is there because "US insider filings — SEC Form 4
 *  open-market purchases" tells someone whether an outage affects them, and a
 *  bare row labelled "us-dealings" does not.
 *
 *  The latency meter is scaled against DEGRADED_MS, not against the slowest
 *  row in the group. Relative scaling would stretch whichever endpoint happened
 *  to be slowest that round to a full bar and make a healthy set look
 *  lopsided; against a fixed threshold, a short bar always means fast and a
 *  full bar always means "at the limit", whatever else is on the page.
 */
import {
  DEGRADED_MS,
  freshnessLabel,
  type ProbeResult,
  type ProbeSpec,
  type Sample,
} from "@/lib/status";
import {
  STATE_DOT,
  STATE_FILL,
  STATE_LABEL,
  STATE_TEXT,
} from "@/components/status/status-tokens";

/** Session-only latency history. Hidden below three samples: two bars is not a
 *  trend, it's a pair of dots pretending to be one. */
function Sparkline({ samples }: { samples: Sample[] }) {
  if (samples.length < 3) return null;

  return (
    <span
      aria-hidden="true"
      className="flex h-3.5 items-end gap-[2px]"
      title={`${samples.length} checks this page view`}
    >
      {samples.map((s) => (
        <span
          key={s.at}
          className={`w-[3px] rounded-[1px] ${STATE_FILL[s.state]} opacity-70`}
          style={{
            // Failures are drawn full-height for the same reason the row hides
            // their duration: a connection refused in 20ms would otherwise be
            // the SHORTEST bar in the series, so an outage would read as the
            // fastest the service has ever been.
            height:
              s.state === "down"
                ? "100%"
                : `${Math.max(12, Math.min(100, (s.ms / DEGRADED_MS) * 100))}%`,
          }}
        />
      ))}
    </span>
  );
}

export function ProbeRow({
  spec,
  result,
  samples,
}: {
  spec: ProbeSpec;
  result: ProbeResult | undefined;
  samples: Sample[];
}) {
  const state = result?.state ?? "checking";
  // A failed probe still has a duration, and it is usually a FAST one — a
  // refused connection comes back in ~20ms. Reporting that as "Not responding
  // · 21 ms" reads as a contradiction, because the number is time-to-failure,
  // not response time. So a down row shows no figure and a full bar: the
  // reader is being told the request didn't land, and how quickly it didn't
  // land is not information they want.
  const failed = result?.state === "down";
  const width =
    result == null
      ? 0
      : failed
        ? 100
        : Math.max(2, Math.min(100, (result.ms / DEGRADED_MS) * 100));

  return (
    <div className="grid gap-x-6 gap-y-2 border-t border-hairline py-4 dark:border-separator sm:grid-cols-[minmax(0,1fr)_13rem]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`size-1.5 shrink-0 rounded-full ${STATE_DOT[state]}`}
          />
          <h3 className="truncate text-[14px] font-semibold leading-[1.3] tracking-[-0.01em] text-foreground">
            {spec.label}
          </h3>
        </div>
        <p className="mt-1 pl-[14px] text-[12.5px] leading-[1.5] text-foreground/55">
          {spec.blurb}
        </p>
        {result?.detail ? (
          <p className="mt-1 pl-[14px] text-[11.5px] leading-[1.5] text-foreground/45">
            {result.detail.label}{" "}
            {result.detail.kind === "time"
              ? freshnessLabel(result.detail.value)
              : result.detail.value}
          </p>
        ) : null}
      </div>

      <div className="pl-[14px] sm:pl-0 sm:text-right">
        <div className="flex items-center gap-2 sm:justify-end">
          <Sparkline samples={samples} />
          <span
            className={`text-[12px] font-semibold ${STATE_TEXT[state]}`}
            // The reason, for anyone who wants it, without giving an HTTP
            // status its own permanent column on a page most readers skim.
            title={result?.error ?? undefined}
          >
            {STATE_LABEL[state]}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 sm:justify-end">
          <span className="h-1 w-20 overflow-hidden rounded-full bg-foreground/10">
            <span
              className={`block h-full rounded-full transition-[width] duration-500 ${
                result ? STATE_FILL[result.state] : "bg-transparent"
              }`}
              style={{ width: `${width}%` }}
            />
          </span>
          <span className="w-14 text-[11.5px] tabular-nums text-foreground/45 sm:text-right">
            {result && !failed ? `${result.ms} ms` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
