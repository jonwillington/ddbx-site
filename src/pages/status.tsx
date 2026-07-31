/** `/status` — the public service-status page.
 *
 *  Cross-market by construction, like `/api`: one page, no market prop, no
 *  discretion gating. The API it reports on is the same one on every domain,
 *  and a reader who hit a wall on ddbx.eu needs the same answer as one on
 *  ddbx.uk.
 *
 *  ---------------------------------------------------------------------------
 *  Two deliberate omissions
 *  ---------------------------------------------------------------------------
 *
 *  1. NO RAIL, and no `AppCtaBand`. Every other page in the shell family ends
 *     with an ask, and the SEO pages carry the affiliate broker directory in
 *     the gutter. Both are wrong here. This page exists to be believed, and
 *     the moment a reader checking whether their data is stale is shown a
 *     paid broker placement next to it, the page stops reading as an
 *     engineering artefact and starts reading as marketing — which is exactly
 *     the reading that makes a status page worthless. The `/api` link at the
 *     end of "How these checks work" is the only forward path, and it goes to
 *     the page a reader who cares about uptime actually wants.
 *
 *  2. NO INVENTED NUMBERS. See the header comment in `lib/status.ts` for the
 *     full argument. Short version: every figure below is measured in the
 *     reader's browser while they watch, the network tab corroborates it, and
 *     nothing claims a window we did not observe. The Statuspage-style 90-day
 *     bar strip is absent because we do not yet run a monitor that could fill
 *     it truthfully.
 *
 *  The ingest cadences in SCHEDULE are read off the cron table in
 *  `ddbx-data/wrangler.toml` and the `scheduled()` dispatch in
 *  `ddbx-data/worker/index.ts`. They are the one part of this page that is
 *  asserted rather than measured, so they are stated as schedule ("runs every
 *  15 minutes"), never as outcome ("ingested successfully"), and they need
 *  re-checking if those crons move.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { ProbeRow } from "@/components/status/probe-row";
import { StatusBanner } from "@/components/status/status-banner";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { StatTiles } from "@/components/seo/stat-tiles";
import DefaultLayout from "@/layouts/default";
import {
  DEGRADED_MS,
  GROUP_LABEL,
  GROUP_ORDER,
  INCIDENTS,
  POLL_MS,
  PROBES,
  overallState,
  useStatusProbes,
} from "@/lib/status";

/** Verified against `ddbx-data/wrangler.toml` + `scheduled()` on 2026-07-31.
 *  All times UTC — Cloudflare cron triggers have no other timezone. */
const SCHEDULE: { job: string; cadence: string; cron: string }[] = [
  { job: "UK RNS ingest", cadence: "Every 15 minutes", cron: "*/15 * * * *" },
  {
    job: "US Form 4 ingest, triage and analysis",
    cadence: "Twice an hour, at :05 and :35",
    cron: "5,35 * * * *",
  },
  {
    job: "US Form 4 reconcile against EDGAR's daily index",
    cadence: "Hourly 08:00–11:00, Tue–Sat",
    cron: "10 8-11 * * 2-6",
  },
  {
    job: "Sweden (FI) and Netherlands (AFM) ingest",
    cadence: "Hourly, at :20",
    cron: "20 * * * *",
  },
  {
    job: "US House disclosure ingest",
    cadence: "Every 6 hours",
    cron: "0 */6 * * *",
  },
  {
    job: "US Senate disclosure ingest",
    cadence: "Daily 10:00",
    cron: "0 10 * * *",
  },
  {
    job: "Company fundamentals refresh",
    cadence: "Daily 06:00",
    cron: "0 6 * * *",
  },
];

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export default function StatusPage() {
  const { results, samples, lastRun, running, refresh } = useStatusProbes();
  const state = overallState(results);

  const tiles = useMemo(() => {
    const values = [...results.values()];
    // Latency stats are computed over endpoints that ANSWERED. Folding a
    // timed-out probe's 10,000ms into a median would report the outage as
    // slowness and understate it — the row already says "Not responding",
    // which is the stronger statement.
    const answered = values.filter((r) => r.state !== "down");
    const times = answered.map((r) => r.ms);
    // Every probe records one sample per round, so any probe's history is the
    // round count. Falls back to 0 before the first round lands.
    const rounds = samples.values().next().value?.length ?? 0;
    const mid = median(times);

    return [
      {
        label: "Endpoints answering",
        value: `${answered.length} of ${PROBES.length}`,
        primary: true,
      },
      {
        label: "Median response",
        value: mid == null ? "—" : `${mid} ms`,
      },
      {
        label: "Slowest",
        value: times.length === 0 ? "—" : `${Math.max(...times)} ms`,
      },
      {
        label: "Checks this visit",
        value: `${rounds * PROBES.length}`,
      },
    ];
  }, [results, samples]);

  return (
    <DefaultLayout>
      <SeoPageShell
        cta={false}
        eyebrow="Service status"
        standfirst={
          <>
            Live checks against the public API that ddbx.uk, ddbx.us, ddbx.eu
            and the mobile apps all read from. {PROBES.length} endpoints,
            re-checked every minute while this page is open.
          </>
        }
        standfirstSize="lede"
        title="Is ddbx working?"
      >
        <StatusBanner
          lastRun={lastRun}
          running={running}
          state={state}
          onRefresh={refresh}
        />

        <StatTiles className="mt-6" cols={4} stats={tiles} />

        {GROUP_ORDER.map((group) => {
          const specs = PROBES.filter((p) => p.group === group);

          if (specs.length === 0) return null;

          return (
            <SeoSection key={group} title={GROUP_LABEL[group]}>
              {specs.map((spec) => (
                <ProbeRow
                  key={spec.id}
                  result={results.get(spec.id)}
                  samples={samples.get(spec.id) ?? []}
                  spec={spec}
                />
              ))}
            </SeoSection>
          );
        })}

        <SeoSection title="How these checks work">
          <div className="space-y-3 text-[14px] leading-[1.65] text-foreground/75">
            <p>
              Your browser requests {PROBES.length} public endpoints and records
              how long each took to answer and parse. It repeats that every{" "}
              {POLL_MS / 1000} seconds while this tab is in front, and stops
              when it isn’t. An endpoint that answers in under{" "}
              {(DEGRADED_MS / 1000).toFixed(1)} seconds is operational; slower
              than that is reported as slow; no answer within 10 seconds is
              reported as not responding.
            </p>
            <p>
              The line under each endpoint is the timestamp on the most recent
              row it would serve you. The UK and US feeds return a calendar date
              rather than a time, so those rows show a date. Bars beside each
              status are the checks made during this page view, so they start
              empty and fill as you stay.
            </p>
            <p>
              There is no ninety-day uptime history here yet. That needs a
              monitor running server-side rather than in your browser, and it is
              on the list.
            </p>
            {/* The scoping caveat and the way out, in the body rather than in
                the small print under the fold. A reader who has decided this
                page is wrong needs the email in front of them, not in grey at
                the bottom. */}
            <p>
              These checks do not cover the App Store, the Play Store, or your
              own network, so a problem you can see that this page cannot is
              most likely one of those.
            </p>
            <p>
              Endpoint documentation lives on the{" "}
              <Link className="underline underline-offset-2" to="/api">
                developer API page
              </Link>
              . If something looks wrong and this page says it isn’t, tell us:{" "}
              <a
                className="underline underline-offset-2"
                href="mailto:hello@ddbx.uk"
              >
                hello@ddbx.uk
              </a>
              .
            </p>
          </div>
        </SeoSection>

        <SeoSection
          aside="All times UTC. These are the schedules the jobs run on, not a record of individual runs."
          title="Ingest schedule"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.08em] text-foreground/45">
                  <th className="pb-2 font-medium">Job</th>
                  <th className="pb-2 font-medium">Runs</th>
                </tr>
              </thead>
              <tbody>
                {SCHEDULE.map((row) => (
                  <tr
                    key={row.cron}
                    className="border-t border-hairline dark:border-separator"
                  >
                    <td className="py-2.5 pr-6 text-[13.5px] leading-[1.45] text-foreground/85">
                      {row.job}
                    </td>
                    <td className="py-2.5 text-[13.5px] leading-[1.45] text-foreground/60">
                      {row.cadence}
                      <span className="ml-2 font-mono text-[11px] text-foreground/35">
                        {row.cron}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SeoSection>

        <SeoSection
          aside="Maintained by hand, and only for incidents that affected published data or API availability."
          title="Incident history"
        >
          {INCIDENTS.length === 0 ? (
            <p className="text-[14px] leading-[1.65] text-foreground/60">
              No incidents recorded since this log started on 2026-07-31.
            </p>
          ) : (
            <ol className="space-y-6">
              {INCIDENTS.map((incident) => (
                <li key={`${incident.date}-${incident.title}`}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                      {incident.title}
                    </h3>
                    <span className="text-[11.5px] tabular-nums text-foreground/45">
                      {incident.date} · {incident.duration} ·{" "}
                      {incident.severity === "outage" ? "Outage" : "Degraded"}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-[1.6] text-foreground/70">
                    {incident.body}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </SeoSection>
      </SeoPageShell>
    </DefaultLayout>
  );
}
