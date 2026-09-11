/** The rolling dealings window, fetched once per visit rather than once per
 *  click.
 *
 *  Eight pages read the same twelve-month window — the sector hub and each
 *  sector, the seven boards that use it, and the company page's sector context
 *  — and each used to fetch it on mount. So every click between them landed on
 *  a skeleton for the 2–4 seconds the download took, even though the page
 *  before had just downloaded the identical object. This keeps the promise
 *  per (market, since, until) for a few minutes, so a second page resolves
 *  from memory, and lets a link say "I'm about to be clicked" so the first
 *  page can resolve before the click lands (`prefetchDealingsWindow`, wired
 *  in `DealingsWindowWarmer`).
 *
 *  The fetch itself asks for `fields=lite` (see shared/dealings-feed.js), and
 *  the API edge-caches that shape for five minutes, so even a cold load is a
 *  ~200KB cache hit for everyone after the first reader.
 *
 *  Browser-only. The pre-render Functions call fetchDealingsWindow directly
 *  with Cloudflare's own cache options; a module-level cache inside a Worker
 *  isolate would outlive the request it was filled for.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import { windowStart } from "../../shared/sectors.js";

import { API_BASE } from "@/lib/api";
import { marketForPath } from "@/lib/markets/registry";

export interface DealingsWindow {
  dealings: Array<Dealing | UsDealing>;
  complete: boolean;
}

export interface WindowRequest {
  market: "UK" | "US";
  since: string;
  until?: string | null;
}

/** Matches the API's edge TTL: a page held longer than the edge holds it
 *  would be staler than a fresh fetch, for no gain. */
const TTL_MS = 5 * 60 * 1000;

interface Entry {
  at: number;
  promise: Promise<DealingsWindow>;
  /** Set once the promise resolves complete, for the synchronous peek. */
  value?: DealingsWindow;
}

const entries = new Map<string, Entry>();

const keyOf = ({ market, since, until }: WindowRequest) =>
  `${market}|${since}|${until ?? ""}`;

function fresh(entry: Entry | undefined): entry is Entry {
  return !!entry && Date.now() - entry.at < TTL_MS;
}

/** The window, from memory when a page (or a hover) has already asked. A
 *  failure or an incomplete window is never kept: the next page retries rather
 *  than inheriting a partial answer for five minutes. */
export function loadDealingsWindow(
  req: WindowRequest,
): Promise<DealingsWindow> {
  const key = keyOf(req);
  const hit = entries.get(key);

  if (fresh(hit)) return hit.promise;

  const entry: Entry = {
    at: Date.now(),
    promise: fetchDealingsWindow({
      apiBase: API_BASE,
      market: req.market,
      since: req.since,
      until: req.until ?? null,
    }) as Promise<DealingsWindow>,
  };

  entry.promise.then(
    (value) => {
      if (value.complete) entry.value = value;
      else if (entries.get(key) === entry) entries.delete(key);
    },
    () => {
      if (entries.get(key) === entry) entries.delete(key);
    },
  );
  entries.set(key, entry);

  return entry.promise;
}

/** The window if it is already in memory, for a page's initial state — so a
 *  page reached after another one renders its data on the first frame instead
 *  of flashing its skeleton for one. */
export function peekDealingsWindow(req: WindowRequest): DealingsWindow | null {
  const hit = entries.get(keyOf(req));

  return fresh(hit) ? (hit.value ?? null) : null;
}

/** The market the window pages read: the domain's, as `useSectorMarket` and
 *  the company page decide it. */
export function hostWindowMarket(): "UK" | "US" {
  const id = marketForPath(
    "/",
    typeof window === "undefined" ? undefined : window.location.hostname,
  ).id;

  return id === "us" || id === "usg" || id === "djt" ? "US" : "UK";
}

/** The rolling window every aggregate page reads, as a request. */
export function rollingWindow(market: "UK" | "US"): WindowRequest {
  return { market, since: windowStart(new Date()) };
}

/** Start the rolling window now, ignoring the result. Safe to call on every
 *  hover: an in-flight or fresh entry is reused, not refetched. */
export function prefetchDealingsWindow(market = hostWindowMarket()): void {
  loadDealingsWindow(rollingWindow(market)).catch(() => {
    /* the page's own load will surface the failure */
  });
}

/** Paths whose page reads the rolling window. Year boards
 *  (/biggest-buys/2026) read a calendar year instead and are not prefetched. */
const WINDOW_PATH =
  /^\/(?:sectors(?:\/[^/]+)?|biggest-buys|best-performing-buys|cluster-buys|most-active-companies|roles(?:\/[^/]+)?|company\/[^/]+)\/?$/;

export function readsDealingsWindow(pathname: string): boolean {
  return WINDOW_PATH.test(pathname);
}
