/** `/status` — the data layer behind the public service-status page.
 *
 *  ---------------------------------------------------------------------------
 *  The one rule this module exists to enforce
 *  ---------------------------------------------------------------------------
 *
 *  Every number this page shows is MEASURED, in the reader's own browser, at
 *  the moment they are looking at it. Nothing here is asserted, seeded,
 *  smoothed or remembered between visits.
 *
 *  That constraint is the whole point. A status page is a trust object: its
 *  only value is that a sceptical reader can check it. A "99.97% uptime"
 *  figure that no monitor produced is worth less than no status page at all,
 *  because the day someone opens devtools, sees the page make no requests, and
 *  posts the screenshot, every other number on ddbx.uk becomes suspect too.
 *  So: no hard-coded uptime percentages, no pre-filled history, no synthetic
 *  90-day bar chart. If we cannot measure it from here, this page does not
 *  claim it.
 *
 *  What that buys us is a page that is genuinely checkable. Open the network
 *  tab and you will see the same nine requests the rows are reporting on, with
 *  the same timings. That is a much stronger legitimacy claim than a green
 *  wall of invented percentages, and it costs nothing to keep true.
 *
 *  ---------------------------------------------------------------------------
 *  What is NOT here, and why
 *  ---------------------------------------------------------------------------
 *
 *  The Statuspage-style "90 days of green bars" strip is deliberately absent.
 *  Drawing it truthfully needs a monitor that ran while nobody was looking,
 *  which means a table in `ddbx-data` written by the existing cron and read
 *  back over an endpoint. That is a cross-repo change and a real design
 *  decision, not something to paper over client-side. Until it exists, this
 *  page shows a live latency meter per row (true from first paint) and a
 *  session sparkline that grows while the tab is open (true, and honestly
 *  captioned as this-browser-only).
 *
 *  ---------------------------------------------------------------------------
 *  Cost
 *  ---------------------------------------------------------------------------
 *
 *  One round is ~38 KB across nine requests, re-run every 60s while the tab is
 *  visible and paused entirely when it is not. `/api/brokers` is deliberately
 *  NOT probed: it is a 112 KB uncacheable-for-our-purposes payload with no
 *  `limit`, and a status page that is itself the heaviest thing on the site is
 *  its own kind of embarrassing. `/api/markets` covers the same "is the
 *  registry answering" question for 2 KB.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { API_BASE } from "@/lib/api";

/** Rounds slower than this are reported as degraded rather than operational.
 *  Set well above the observed spread (63ms for /markets, ~1.2s for the US
 *  feed's stats rollup) so ordinary variance doesn't paint the page amber. */
export const DEGRADED_MS = 2500;

/** Abort a probe past this and call it down. Long enough that a cold Worker
 *  isolate or a bad mobile connection isn't libelled as an outage. */
const TIMEOUT_MS = 10_000;

/** Re-probe cadence while the tab is visible. */
export const POLL_MS = 60_000;

/** Session sparkline depth — 30 rounds at POLL_MS is half an hour. */
const MAX_SAMPLES = 30;

export type ProbeState = "operational" | "degraded" | "down";

export type ProbeGroup = "core" | "feeds" | "reference";

export const GROUP_LABEL: Record<ProbeGroup, string> = {
  core: "Core API",
  feeds: "Disclosure feeds",
  reference: "Reference data",
};

/** Order the groups render in. */
export const GROUP_ORDER: ProbeGroup[] = ["core", "feeds", "reference"];

/** A fact read out of a successful response, shown under the row.
 *
 *  `label` travels WITH the value rather than being fixed by the row, because
 *  the alternative bit us: with one hard-coded "Newest record" prefix, the
 *  market-registry probe's perfectly reasonable `"9 markets"` was rendered as
 *  "Newest record 9279d ago". `Date.parse("9 markets")` does not throw and does
 *  not return NaN — V8's fallback parser reads it as 2001-03-09 — so nothing
 *  downstream could have caught it. Carrying the label and the kind together
 *  means a non-temporal fact can never be formatted as a time. */
export interface ProbeDetail {
  label: string;
  value: string;
  /** "time" runs through `freshnessLabel`; "text" is rendered verbatim. */
  kind: "time" | "text";
}

export interface ProbeSpec {
  id: string;
  label: string;
  /** One line on what this endpoint actually serves — a status row that just
   *  says "API" tells a reader nothing about what is or isn't affected. */
  blurb: string;
  /** Path relative to `API_BASE`. */
  path: string;
  group: ProbeGroup;
  /** Pulls a fact out of a successful response, so one request serves both the
   *  up/down check and the "how current is this feed" line. Return null when
   *  the payload carries no such fact. */
  detail?: (json: unknown) => ProbeDetail | null;
}

// -- payload readers ---------------------------------------------------------
// Written defensively: these run against a live production response, and a
// probe that throws while formatting a detail line would report a healthy
// endpoint as down. Every reader returns null rather than assuming a shape.

type Json = Record<string, unknown>;

const asObj = (v: unknown): Json | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : null;

const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** First element of `key`'s array, as an object. */
function firstRow(json: unknown, key: string): Json | null {
  const root = asObj(json);

  if (!root) return null;

  return asObj(asArr(root[key])[0]);
}

const disclosure = (value: string): ProbeDetail => ({
  label: "Newest disclosure",
  value,
  kind: "time",
});

/** A `disclosed_date` off the newest row of a dealings-shaped response. */
function newestDisclosure(key: string) {
  return (json: unknown): ProbeDetail | null => {
    const row = firstRow(json, key);
    const date = row?.disclosed_date;

    return typeof date === "string" ? disclosure(date) : null;
  };
}

/** `stats.latest_disclosed_date`, where the endpoint publishes one. */
function statsLatest(json: unknown): ProbeDetail | null {
  const stats = asObj(asObj(json)?.stats);
  const date = stats?.latest_disclosed_date;

  return typeof date === "string" ? disclosure(date) : null;
}

export const PROBES: ProbeSpec[] = [
  {
    id: "version",
    label: "Ingest heartbeat",
    blurb: "Timestamp of the most recent row written to the database.",
    path: "/version",
    group: "core",
    detail: (json) => {
      const latest = asObj(json)?.latest;

      return typeof latest === "string"
        ? { label: "Last write", value: latest, kind: "time" }
        : null;
    },
  },
  {
    id: "markets",
    label: "Market registry",
    blurb: "The market list and capability flags every client reads on launch.",
    path: "/markets",
    group: "core",
    detail: (json) => {
      const n = asArr(asObj(json)?.markets).length;

      return n > 0
        ? { label: "Serving", value: `${n} markets`, kind: "text" }
        : null;
    },
  },
  {
    id: "uk",
    label: "UK director dealings",
    blurb: "PDMR notices from RNS, parsed and rated.",
    path: "/dealings?limit=1",
    group: "feeds",
    detail: newestDisclosure("dealings"),
  },
  {
    id: "us",
    label: "US insider filings",
    blurb: "SEC Form 4 open-market purchases, triaged and rated.",
    path: "/us-dealings?limit=1",
    group: "feeds",
    detail: statsLatest,
  },
  {
    id: "usg",
    label: "US Congress",
    blurb: "House STOCK Act periodic transaction reports.",
    path: "/gov-dealings?limit=1",
    group: "feeds",
    detail: newestDisclosure("dealings"),
  },
  {
    id: "se",
    label: "Sweden",
    blurb: "Finansinspektionen's insider register.",
    // The EU endpoint's `stats` block is global across SE and NL regardless of
    // `?market`, so per-market freshness has to come off the row itself.
    path: "/eu-dealings?market=SE&limit=1",
    group: "feeds",
    detail: newestDisclosure("dealings"),
  },
  {
    id: "nl",
    label: "Netherlands",
    blurb: "AFM's insider transaction register.",
    path: "/eu-dealings?market=NL&limit=1",
    group: "feeds",
    detail: newestDisclosure("dealings"),
  },
  {
    id: "fx",
    label: "FX rates",
    blurb: "GBP/USD, used to reconcile cross-market values.",
    path: "/fx/gbp-per-usd?days=1",
    group: "reference",
    detail: (json) => {
      const rates = asArr(asObj(json)?.rates);
      const last = asObj(rates[rates.length - 1]);
      const date = last?.date;

      return typeof date === "string"
        ? { label: "Latest close", value: date, kind: "time" }
        : null;
    },
  },
  {
    id: "news",
    label: "UK news",
    blurb: "Company headlines attached to UK disclosures.",
    path: "/news/uk",
    group: "reference",
    detail: (json) => {
      const at = asObj(json)?.fetched_at;

      return typeof at === "string"
        ? { label: "Fetched", value: at, kind: "time" }
        : null;
    },
  },
];

export interface ProbeResult {
  id: string;
  state: ProbeState;
  /** Round-trip milliseconds, measured across fetch + JSON parse. */
  ms: number;
  /** HTTP status, or null when the request never completed. */
  httpStatus: number | null;
  /** Why it's down, for the row's title attribute. Null when healthy. */
  error: string | null;
  /** Fact read off the payload, if the probe declares a reader. */
  detail: ProbeDetail | null;
  checkedAt: number;
}

export interface Sample {
  at: number;
  ms: number;
  state: ProbeState;
}

async function runProbe(spec: ProbeSpec): Promise<ProbeResult> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const fail = (error: string, httpStatus: number | null): ProbeResult => ({
    id: spec.id,
    state: "down",
    ms: Math.round(performance.now() - started),
    httpStatus,
    error,
    detail: null,
    checkedAt: Date.now(),
  });

  try {
    // `cache: "no-store"` matters more than it looks: /api/version carries a
    // 15s max-age, so without it a poll inside that window would be served
    // from the HTTP cache in ~0ms and the page would report a latency it never
    // measured — the exact class of pleasant fiction this module bans.
    const res = await fetch(`${API_BASE}${spec.path}`, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) return fail(`HTTP ${res.status}`, res.status);

    const json: unknown = await res.json();
    const ms = Math.round(performance.now() - started);

    let detail: ProbeDetail | null = null;

    // A malformed detail must never demote a healthy endpoint: the request
    // succeeded, which is what the row is actually reporting on.
    try {
      detail = spec.detail?.(json) ?? null;
    } catch {
      detail = null;
    }

    return {
      id: spec.id,
      state: ms > DEGRADED_MS ? "degraded" : "operational",
      ms,
      httpStatus: res.status,
      error: null,
      detail,
      checkedAt: Date.now(),
    };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";

    return fail(
      aborted ? `No response in ${TIMEOUT_MS / 1000}s` : "Request failed",
      null,
    );
  } finally {
    clearTimeout(timer);
  }
}

export type OverallState = ProbeState | "checking";

/** The banner's verdict. Any single hard failure outranks any amount of
 *  slowness, because "one feed is down" is the sentence a reader needs first. */
export function overallState(results: Map<string, ProbeResult>): OverallState {
  if (results.size < PROBES.length) return "checking";
  const values = [...results.values()];

  if (values.some((r) => r.state === "down")) return "down";
  if (values.some((r) => r.state === "degraded")) return "degraded";

  return "operational";
}

export interface StatusFeed {
  results: Map<string, ProbeResult>;
  /** Per-probe round history for this page view only. */
  samples: Map<string, Sample[]>;
  lastRun: number | null;
  running: boolean;
  refresh: () => void;
}

/** Probes every endpoint on mount, then every `POLL_MS` while the tab is
 *  visible. Hidden tabs stop polling and re-probe immediately on return, so a
 *  page left open overnight doesn't show a twelve-hour-old reading as current
 *  or spend twelve hours asking. */
export function useStatusProbes(): StatusFeed {
  const [results, setResults] = useState<Map<string, ProbeResult>>(new Map());
  const [samples, setSamples] = useState<Map<string, Sample[]>>(new Map());
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [running, setRunning] = useState(true);
  // Guards against a visibility-change refresh landing on top of an in-flight
  // round and double-counting samples.
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const runAll = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRunning(true);

    const settled = await Promise.all(PROBES.map(runProbe));

    if (!mounted.current) {
      inFlight.current = false;

      return;
    }

    setResults(new Map(settled.map((r) => [r.id, r])));
    setSamples((prev) => {
      const next = new Map(prev);

      for (const r of settled) {
        const history = [
          ...(next.get(r.id) ?? []),
          { at: r.checkedAt, ms: r.ms, state: r.state },
        ];

        next.set(r.id, history.slice(-MAX_SAMPLES));
      }

      return next;
    });
    setLastRun(Date.now());
    setRunning(false);
    inFlight.current = false;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void runAll();

    let timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void runAll();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Restart the interval from now, so returning to the tab doesn't fire a
      // second round a moment after the catch-up one.
      window.clearInterval(timer);
      void runAll();
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") void runAll();
      }, POLL_MS);
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [runAll]);

  return { results, samples, lastRun, running, refresh: () => void runAll() };
}

// -- formatting --------------------------------------------------------------

/** "just now" / "40s ago" / "6m ago" / "3h ago". Used for both the last-check
 *  stamp and feed freshness, so the two read on the same scale. */
export function timeAgo(from: number, now = Date.now()): string {
  const secs = Math.max(0, Math.round((now - from) / 1000));

  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);

  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);

  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}

/** Matches `YYYY-MM-DDTHH:MM:SS` with an optional fractional part and an
 *  optional `Z`, or the Worker's space-separated variant. */
const TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(\.\d+)?Z?$/;

/** Renders a timestamp detail for display.
 *
 *  The API is not consistent about these and we are not going to pretend it
 *  is: `/api/version` returns `"2026-07-30 16:46:23"` (space-separated, UTC,
 *  no zone marker), Sweden returns a real `Z`-suffixed instant, the Netherlands
 *  returns `"2026-07-30T00:00:00Z"`, and the UK and US feeds return a bare
 *  `YYYY-MM-DD`.
 *
 *  Two rules, both about not inventing precision:
 *
 *  1. A bare date has no time of day, so it is shown as a date. "18h ago" off
 *     a `YYYY-MM-DD` would be measuring from a midnight nobody recorded.
 *  2. A timestamp of exactly `00:00:00` is a date that has been padded into an
 *     instant, and is treated as rule 1. The Netherlands feed is the live case:
 *     rendered as an instant it read "1d ago", which is a claim about when AFM
 *     published that the payload does not actually support.
 *
 *  Parsing is deliberately gated behind an explicit shape test rather than
 *  handed to `Date.parse`, which is lenient to the point of being dangerous:
 *  `Date.parse("9 markets")` returns 984081600000 (2001-03-09) rather than
 *  NaN, so a non-temporal string reached the UI as a confident "9279d ago".
 *  Anything that doesn't match a real timestamp shape is passed through
 *  verbatim. */
export function freshnessLabel(detail: string, now = Date.now()): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(detail)) return detail;

  const match = TIMESTAMP_RE.exec(detail);

  if (!match) return detail;
  const [, date, time, frac] = match;

  if (time === "00:00:00") return date;

  // Rebuilt rather than passed through: Safari returns NaN on the Worker's
  // space-separated form, so a stamp that read fine on Chrome showed "Invalid
  // Date" on iOS. The trailing Z is explicit because these are all UTC.
  const parsed = Date.parse(`${date}T${time}${frac ?? ""}Z`);

  if (Number.isNaN(parsed)) return detail;

  return timeAgo(parsed, now);
}

// -- incident log ------------------------------------------------------------

export interface Incident {
  /** ISO date the incident started, YYYY-MM-DD. */
  date: string;
  title: string;
  /** "resolved" is the only state a hand-maintained log can honestly claim
   *  retrospectively; anything live belongs in the banner, not here. */
  severity: "outage" | "degraded";
  /** What broke, what the reader would have seen, and what fixed it. */
  body: string;
  /** Wall-clock duration, e.g. "1h 40m". */
  duration: string;
}

/** Hand-maintained, and honest about it — see the note the page renders under
 *  this section.
 *
 *  ADD ENTRIES WHEN THINGS BREAK. An empty log is only credible while it is
 *  true; a log that stays empty through an outage the users noticed is worse
 *  than no log. Newest first. */
export const INCIDENTS: Incident[] = [];
