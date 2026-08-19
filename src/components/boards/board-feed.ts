/** The rolling twelve-month dealings window every derived board reads.
 *
 *  All four of the 2026-08-19 families — the performance board, the activity
 *  board, cluster buying and the role hubs — rank the same fetch, differing
 *  only in how they group it. One hook so they cannot disagree about the
 *  window, and so a change to the truncation posture lands on all of them.
 *
 *  `complete` is the load-bearing field, not `rows`. A failed fetch and a
 *  genuinely empty period are the same shape — an empty array — and only one
 *  of them is a fact about the market. Stating "no qualifying purchases" during
 *  an API incident tells a reader there was no insider buying this year. The
 *  catch sets `complete: false` for the same reason fetchDealingsWindow does
 *  when it breaks out on a bad response.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useState } from "react";

import { fetchDealingsWindow } from "../../../shared/dealings-feed.js";
import { windowStart } from "../../../shared/sectors.js";

import { API_BASE } from "@/lib/api";

export interface BoardFeed {
  rows: Array<Dealing | UsDealing> | null;
  complete: boolean;
}

export function useBoardFeed(market: "UK" | "US"): BoardFeed {
  const [rows, setRows] = useState<Array<Dealing | UsDealing> | null>(null);
  const [complete, setComplete] = useState(true);

  useEffect(() => {
    let live = true;

    fetchDealingsWindow({
      apiBase: API_BASE,
      market,
      since: windowStart(new Date()),
      until: null,
    })
      .then(
        (r: { dealings: Array<Dealing | UsDealing>; complete: boolean }) => {
          if (!live) return;
          setRows(r.dealings);
          setComplete(r.complete);
        },
      )
      .catch(() => {
        if (!live) return;
        setRows([]);
        setComplete(false);
      });

    return () => {
      live = false;
    };
  }, [market]);

  return { rows, complete };
}
