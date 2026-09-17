/** The Insider Index slot on a daily edition, tolerant of the module being
 *  absent.
 *
 *  `shared/insider-index.js` is being built on another branch. This adapter
 *  is the ONLY place the edition page touches it, and it reaches it through
 *  `import.meta.glob` rather than a static import: a glob that matches no file
 *  is an empty object at build time, so this branch builds on its own, and
 *  the moment the module lands on disk the same glob resolves to a lazy chunk
 *  and the slot lights up with no code change here.
 *
 *  Contract, as the index's author has it (revised 2026-09-17):
 *
 *    readingSummary(dealings, date, "UK", { now }) -> null | {
 *      score, tier: { label, phrase }, sentence, windowSentence,
 *      weekChange, path, method, ...
 *    }
 *    indexWindow(now, "UK")   -> fetchDealingsWindow options (disclosed-day
 *                                window, the rows every renderer ranks)
 *    publishedThrough(now)    -> the last date with a published reading
 *    publishLabel(date)       -> "7am on 18 September"
 *
 *  A day's reading is published at 7am London on the calendar day after it,
 *  so readingSummary is null for today's edition by design. That null is not
 *  a failure and not a missing number: the slot says when the reading lands,
 *  in the module's own words for the time. Any other null (a weekend, before
 *  the first full window, the module absent, the window failed) renders
 *  nothing. The sentence is the module's; nothing here restates it.
 *
 *  UK only: the index's author asks that no US reading be printed.
 */
import { fetchDealingsWindow } from "../../shared/dealings-feed.js";

import { API_BASE } from "@/lib/api";

export interface InsiderIndexReading {
  score: number;
  tier: { id?: string; label: string; phrase: string };
  sentence: string;
  windowSentence?: string;
  weekChange?: number | null;
  path?: string;
  method?: string;
}

/** What the edition renders in the slot. */
export type InsiderIndexSlot =
  | { kind: "reading"; reading: InsiderIndexReading }
  /** The day's reading is not published yet; `landsAt` is the module's
   *  label for when it will be ("7am on 18 September"). */
  | { kind: "pending"; landsAt: string };

interface IndexModule {
  readingSummary?: (
    dealings: unknown[],
    date: string,
    market: string,
    opts?: { now?: Date },
  ) => InsiderIndexReading | null;
  indexWindow?: (now: Date, market: string) => Record<string, unknown>;
  publishedThrough?: (now: Date, market: string) => string;
  publishLabel?: (date: string) => string;
  isIndexDay?: (date: string, market: string) => boolean;
}

// TODO(insider-index): remove the glob indirection once
// shared/insider-index.js has merged and import it directly.
const MODULE_PATH = "../../shared/insider-index.js";
const modules = import.meta.glob("../../shared/insider-index.js") as Record<
  string,
  () => Promise<unknown>
>;

/** Whether the index module is present in this build. */
export const INSIDER_INDEX_AVAILABLE = MODULE_PATH in modules;

/** The slot for a UK trading day: a reading, a "lands at" notice for a day
 *  whose reading is not out yet, or null for nothing to show. Never throws:
 *  the slot is a bonus on the page, not the page. */
export async function insiderIndexSlot(
  market: "UK" | "US",
  date: string,
  now: Date = new Date(),
): Promise<InsiderIndexSlot | null> {
  if (market !== "UK") return null;
  const load = modules[MODULE_PATH];

  if (!load) return null;
  try {
    const mod = (await load()) as IndexModule;

    if (typeof mod.readingSummary !== "function") return null;
    if (mod.isIndexDay && !mod.isIndexDay(date, "UK")) return null;

    // Not published yet. Decided before the window is fetched: today's
    // edition needs no twelve months of rows to say "tomorrow at 7am".
    if (
      mod.publishedThrough &&
      mod.publishLabel &&
      date > mod.publishedThrough(now, "UK")
    ) {
      return { kind: "pending", landsAt: mod.publishLabel(date) };
    }

    if (typeof mod.indexWindow !== "function") return null;
    const { dealings, complete } = await fetchDealingsWindow({
      apiBase: API_BASE,
      ...(mod.indexWindow(now, "UK") as {
        market: "UK";
        since: string;
        windowOn?: "trade" | "disclosed";
      }),
    });

    // A partial window under-counts every earlier window the day is ranked
    // against, which would print a wrong percentile as a right one.
    if (!complete) return null;
    const reading = mod.readingSummary(dealings, date, "UK", { now });

    return reading && Number.isFinite(reading.score)
      ? { kind: "reading", reading }
      : null;
  } catch {
    return null;
  }
}
