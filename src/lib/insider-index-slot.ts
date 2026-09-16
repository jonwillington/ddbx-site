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
 *  Contract, as agreed with the index's author (2026-09-16):
 *
 *    readingSummary(dealings, date, "UK") -> null | {
 *      score, tier: { label, phrase }, sentence, windowSentence,
 *      weekChange, path, ...
 *    }
 *
 *  `dealings` is the ROLLING TWELVE-MONTH UK WINDOW — the same rows every
 *  board reads (src/lib/dealings-window.ts) — not the day's rows: a reading is
 *  a 20-trading-day window ranked against every earlier window since March,
 *  so it needs the whole record. Lite rows are fine. UK only: the US feed is
 *  a curated subset and the index's author asks that no US reading be
 *  printed. Null means "no published reading" (weekend, before 2026-05-29,
 *  future, or feed too thin) and the slot renders nothing.
 *
 *  The window is only fetched when the module exists, so a build without it
 *  costs the edition page no extra request.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { loadDealingsWindow, rollingWindow } from "@/lib/dealings-window";

export interface InsiderIndexReading {
  score: number;
  tier: { id?: string; label: string; phrase: string };
  sentence: string;
  windowSentence?: string;
  weekChange?: number | null;
  path?: string;
}

type ReadingSummary = (
  dealings: Array<Dealing | UsDealing>,
  date: string,
  market: string,
) => InsiderIndexReading | null;

// TODO(insider-index): remove the glob indirection once
// shared/insider-index.js has merged and import it directly.
const MODULE_PATH = "../../shared/insider-index.js";
const modules = import.meta.glob("../../shared/insider-index.js") as Record<
  string,
  () => Promise<unknown>
>;

/** Whether the index module is present in this build. */
export const INSIDER_INDEX_AVAILABLE = MODULE_PATH in modules;

/** The reading for a UK trading day, or null when there is none — or when the
 *  module is absent, the window failed, or the market is not UK. Never
 *  throws: the slot is a bonus on the page, not the page. */
export async function insiderIndexReading(
  market: "UK" | "US",
  date: string,
): Promise<InsiderIndexReading | null> {
  if (market !== "UK") return null;
  const load = modules[MODULE_PATH];

  if (!load) return null;
  try {
    const mod = (await load()) as { readingSummary?: ReadingSummary };

    if (typeof mod.readingSummary !== "function") return null;
    const { dealings, complete } = await loadDealingsWindow(
      rollingWindow("UK"),
    );

    // A partial window under-counts every earlier window the day is ranked
    // against, which would print a wrong percentile as a right one.
    if (!complete) return null;
    const reading = mod.readingSummary(dealings, date, "UK");

    return reading && Number.isFinite(reading.score) ? reading : null;
  } catch {
    return null;
  }
}
