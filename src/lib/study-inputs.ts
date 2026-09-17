/** What a living study page reads: the whole-record dealings window and the
 *  market's 90-day outcomes slice, both held in memory for a few minutes so a
 *  second study (or a hover on a study link) resolves without a download.
 *
 *  The window goes through src/lib/dealings-window.ts, so the boards and the
 *  studies share one cache and one prefetch path. The outcomes slice is cached
 *  here on the same terms: a failure is never kept.
 *
 *  `failed` is its own state, never an empty study. A study whose outcomes
 *  could not be loaded has no sample, and the page must say "couldn't load",
 *  not "not enough data yet": one is an API incident, the other is a claim
 *  about the record.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";
import type { StudyOutcome } from "../../shared/studies";

import { useEffect, useState } from "react";

import { fetchOutcomes, studyWindow } from "../../shared/studies.js";

import { API_BASE } from "@/lib/api";
import { loadDealingsWindow, peekDealingsWindow } from "@/lib/dealings-window";

type Market = "UK" | "US";

const TTL_MS = 5 * 60 * 1000;

interface OutcomesEntry {
  at: number;
  promise: Promise<StudyOutcome[]>;
  value?: StudyOutcome[];
}

const outcomes = new Map<Market, OutcomesEntry>();

function loadOutcomes(market: Market): Promise<StudyOutcome[]> {
  const hit = outcomes.get(market);

  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;

  const entry: OutcomesEntry = {
    at: Date.now(),
    promise: fetchOutcomes({ apiBase: API_BASE, market }).then((r) => {
      if (!r.ok || !r.body) throw new Error("outcomes unavailable");

      return r.body.outcomes;
    }),
  };

  entry.promise.then(
    (value) => {
      entry.value = value;
    },
    () => {
      if (outcomes.get(market) === entry) outcomes.delete(market);
    },
  );
  outcomes.set(market, entry);

  return entry.promise;
}

/** Start the outcomes slice for a market, ignoring the result. */
export function prefetchStudyOutcomes(market: Market): void {
  loadOutcomes(market).catch(() => {
    /* the page's own load will surface the failure */
  });
}

export interface StudyInputs {
  rows: Array<Dealing | UsDealing> | null;
  outcomes: StudyOutcome[] | null;
  /** False when the window could not be loaded in full. */
  complete: boolean;
  /** Either fetch failed outright. */
  failed: boolean;
}

function peek(market: Market): StudyInputs {
  const window = peekDealingsWindow(studyWindow(market));
  const hit = outcomes.get(market);
  const fresh = hit && Date.now() - hit.at < TTL_MS ? hit.value : undefined;

  return window && fresh
    ? { rows: window.dealings, outcomes: fresh, complete: true, failed: false }
    : { rows: null, outcomes: null, complete: true, failed: false };
}

export function useStudyInputs(market: Market): StudyInputs {
  const [state, setState] = useState<StudyInputs>(() => peek(market));

  useEffect(() => {
    let live = true;

    Promise.all([loadDealingsWindow(studyWindow(market)), loadOutcomes(market)])
      .then(([window, out]) => {
        if (!live) return;
        setState({
          rows: window.dealings,
          outcomes: out,
          complete: window.complete,
          failed: window.dealings.length === 0 && !window.complete,
        });
      })
      .catch(() => {
        if (!live) return;
        setState({ rows: [], outcomes: [], complete: false, failed: true });
      });

    return () => {
      live = false;
    };
  }, [market]);

  return state;
}
