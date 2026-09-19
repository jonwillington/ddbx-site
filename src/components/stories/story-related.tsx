/** What sits under an article: recent buys by insiders in the same sector,
 *  then the other stories.
 *
 *  Similar trades read the same twelve-month dealings window the sector hubs
 *  and boards already pull (src/lib/dealings-window.ts), so on most visits it
 *  is a memory hit and never a second download. The story's sector is taken
 *  from its subject's own rows in that window rather than carried on the
 *  story, so no wire change was needed for it. A subject with no buy in the
 *  window, or no sector, draws no section: this is a follow-on list, and a
 *  section saying "nothing here" under an article is noise, not a state.
 */
import type { Dealing, Story, StoryListItem, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { filingPath } from "../../../shared/filings.js";
import {
  dealPerson,
  dealValue,
  sectorByLabel,
  sectorPath,
  MARKET_SYMBOL,
} from "../../../shared/sectors.js";

import { BoardRow, BoardRowList } from "@/components/boards/board-row";
import { CompanyLogo } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { SeoSection } from "@/components/seo/section";
import { money } from "@/components/sector-ui";
import { StoryRow } from "@/components/stories/story-row";
import { api } from "@/lib/api";
import {
  cleanCompanyName,
  cleanInsiderName,
  displayTicker,
} from "@/lib/company";
import { localeFor } from "@/lib/company-format";
import {
  loadDealingsWindow,
  peekDealingsWindow,
  rollingWindow,
} from "@/lib/dealings-window";

/** How far back "lately" reaches, and how many rows it shows. */
const RECENT_DAYS = 90;
const SIMILAR_MAX = 6;
const MORE_MAX = 4;

type Row = Dealing | UsDealing;

/** Ticker compared bare and upper-case, so `HAS.L`, `HAS` and `has` meet. */
const bare = (t: string | null | undefined) =>
  String(t ?? "")
    .replace(/\.L$/i, "")
    .toUpperCase();

function subjectTickers(s: Story): string[] {
  const all = [...s.subject_tickers, s.subject_ticker, s.chart?.ticker].filter(
    (t): t is string => !!t,
  );

  return [...new Set(all.map(bare))];
}

function useWindow(market: "UK" | "US") {
  const [rows, setRows] = useState<Row[] | null>(
    () => peekDealingsWindow(rollingWindow(market))?.dealings ?? null,
  );

  useEffect(() => {
    let live = true;

    loadDealingsWindow(rollingWindow(market))
      .then((r) => live && setRows(r.dealings))
      .catch(() => live && setRows([]));

    return () => {
      live = false;
    };
  }, [market]);

  return rows;
}

export function SimilarTrades({ story }: { story: Story }) {
  const market: "UK" | "US" = story.market === "US" ? "US" : "UK";
  const feed = useWindow(market);

  const picked = useMemo(() => {
    if (!feed) return null;
    const subjects = new Set(subjectTickers(story));

    // The subject's sector is the one its own rows are filed under most often:
    // a sector piece spans several companies, which usually share one.
    const counts = new Map<string, number>();

    for (const d of feed) {
      if (!subjects.has(bare(d.ticker)) || !d.sector_normalized) continue;
      counts.set(
        d.sector_normalized,
        (counts.get(d.sector_normalized) ?? 0) + 1,
      );
    }
    const label = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const sector = sectorByLabel(label);

    if (!sector) return null;

    const since = new Date(Date.now() - RECENT_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const seen = new Set<string>();
    const rows: Row[] = [];

    // One row per company, its latest buy: a cluster at one issuer would
    // otherwise fill the list with the same logo.
    for (const d of [...feed].sort((a, b) =>
      a.trade_date < b.trade_date ? 1 : -1,
    )) {
      const t = bare(d.ticker);

      if (
        d.sector_normalized !== label ||
        subjects.has(t) ||
        seen.has(t) ||
        d.trade_date < since ||
        ("tx_type" in d && d.tx_type !== "buy")
      )
        continue;
      seen.add(t);
      rows.push(d);
      if (rows.length === SIMILAR_MAX) break;
    }

    return rows.length > 0 ? { sector, rows } : null;
  }, [feed, story]);

  if (!picked) return null;

  const symbol = MARKET_SYMBOL[market];
  const locale = localeFor(market);

  return (
    <SeoSection
      aside={
        <>
          Latest buys by insiders at other{" "}
          <Link
            className="underline decoration-hairline underline-offset-2 hover:text-foreground dark:decoration-separator"
            to={sectorPath(picked.sector.slug)}
          >
            {picked.sector.label.toLowerCase()}
          </Link>{" "}
          companies, over the last three months.
        </>
      }
      title="Similar trades"
    >
      <BoardRowList className="mt-4">
        {picked.rows.map((d) => {
          const ret = d.live_performance?.return_pct_trade ?? null;
          const person = cleanInsiderName(dealPerson(d) ?? "");
          const paid = dealValue(d);

          return (
            <BoardRow
              key={d.id}
              badge={<TickerPill ticker={displayTicker(d.ticker)} />}
              date={{ iso: d.trade_date, locale }}
              figure={
                ret != null
                  ? {
                      srLabel: "return since the buy",
                      unit: "since the buy",
                      value: (
                        <span
                          className={
                            ret >= 0 ? "text-positive" : "text-negative"
                          }
                        >
                          {ret >= 0 ? "+" : "−"}
                          {Math.abs(ret).toFixed(1)}%
                        </span>
                      ),
                    }
                  : undefined
              }
              logo={<CompanyLogo size={56} ticker={d.ticker} />}
              name={cleanCompanyName(d.company) || displayTicker(d.ticker)}
              secondary={[
                person || null,
                paid > 0 ? `bought ${money(paid, symbol)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              to={market === "US" ? `/us/dealings/${d.id}` : filingPath(d.id)}
            />
          );
        })}
      </BoardRowList>
    </SeoSection>
  );
}

export function MoreStories({ story }: { story: Story }) {
  const [list, setList] = useState<StoryListItem[] | null>(null);

  useEffect(() => {
    let live = true;

    api
      .stories(story.market === "US" ? "US" : "UK")
      .then((r) => live && setList(r.stories))
      .catch(() => live && setList([]));

    return () => {
      live = false;
    };
  }, [story.market]);

  const rows = (list ?? []).filter((s) => s.id !== story.id).slice(0, MORE_MAX);

  if (rows.length === 0) return null;

  return (
    <SeoSection
      aside={
        <>
          Other buys we went back to.{" "}
          <Link
            className="underline decoration-hairline underline-offset-2 hover:text-foreground dark:decoration-separator"
            to="/stories"
          >
            Every story
          </Link>
          .
        </>
      }
      title="More stories"
    >
      <BoardRowList className="mt-4">
        {rows.map((s) => (
          <StoryRow key={s.id} story={s} />
        ))}
      </BoardRowList>
    </SeoSection>
  );
}
