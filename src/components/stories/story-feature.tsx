/** The latest story, as the big preview at the top of /stories.
 *
 *  Its one job is to get the reader into that article. A first cut
 *  (2026-09-27) put the h1 in a dark stage with a tally of every story and the
 *  article's full interactive chart; Jon: "way too big — this is just supposed
 *  to propel you into the next article, not be a standalone section recording
 *  the data." So the tally went and the stage went. What's left is a preview
 *  card, the whole of it one link:
 *
 *    kicker · logo, ticker, return · what £1,000 became · the headline at
 *    reading size · "Read the story →"
 *
 *  with a sparkline of the price since the buy beside it, the same
 *  `BuySparkline` the boards draw, so the card has a picture without an
 *  interactive chart (period tabs inside a link are a trap).
 *
 *  The sparkline needs the story's chart anchor (ticker and trade date), which
 *  the list doesn't carry, so it waits on `/api/stories/:id` plus the price
 *  history. Its slot holds its size meanwhile; with no anchor it draws the
 *  sparkline's own empty ground rather than a fake line.
 */
import type { StoryListItem } from "@/types/ddbx";
import type { Bars } from "@/components/boards/board-prices";
import type { BoardRow as BoardRowModel } from "@/components/boards/board-model";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BuySparkline } from "@/components/boards/buy-sparkline";
import { CompanyLogo } from "@/components/company-logo";
import { Delta } from "@/components/ui/delta";
import { Eyebrow } from "@/components/ui/eyebrow";
import { panel } from "@/components/ui/panel";
import { stakeLine, storyTickers } from "@/components/stories/story-row";
import { api } from "@/lib/api";
import { STORY_KIND_LABEL, storyPath } from "@/lib/stories";

const display = (t: string) => t.replace(/\.L$/, "");

/** BuySparkline reads only the two dates off its row (see sparkAnchor in
 *  download/winners-board.tsx, which makes the same narrowing). */
function anchor(tradeDate: string): BoardRowModel {
  return { disclosedDate: tradeDate, tradeDate } as BoardRowModel;
}

/** Ticker, trade date and price history for the sparkline. */
function useStorySpark(id: string) {
  const [spark, setSpark] = useState<{
    tradeDate: string;
    bars: Bars;
  } | null>(null);

  useEffect(() => {
    let live = true;

    setSpark(null);
    api
      .story(id)
      .then(async (s) => {
        const c = s.chart;

        if (!c || !live) return;
        const days =
          Math.ceil((Date.now() - Date.parse(c.trade_date)) / 864e5) + 45;
        const bars = await api.priceHistory(c.ticker, Math.min(days, 400));

        if (live) {
          setSpark({
            tradeDate: c.trade_date,
            bars: bars.map((b) => ({ date: b.date, close: b.close_pence })),
          });
        }
      })
      .catch(() => {
        /* no picture; the card's figures still state the result */
      });

    return () => {
      live = false;
    };
  }, [id]);

  return spark;
}

export function StoryFeature({ story: s }: { story: StoryListItem }) {
  const tickers = storyTickers(s);
  const single = tickers.length === 1 ? tickers[0] : null;
  const kind = STORY_KIND_LABEL[s.kind] ?? s.kind;
  const ret = s.return_pct;
  const spark = useStorySpark(s.id);

  return (
    <Link
      className={`group mt-8 grid overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] ${panel({ variant: "sheet", lift: true })} transition-shadow hover:shadow-float`}
      data-ga-event="stories_latest_open"
      data-ga-label={s.id}
      to={storyPath(s.id)}
    >
      <div className="p-6 sm:p-8">
        <Eyebrow>{`Latest story · ${kind}`}</Eyebrow>

        <div className="mt-4 flex items-center gap-3.5">
          {single ? (
            <CompanyLogo market={s.market} size={48} ticker={single} />
          ) : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="text-subheading font-semibold text-foreground">
                {single ? display(single) : kind}
              </span>
              {ret != null ? (
                <Delta className="font-semibold" size="title" value={ret} />
              ) : null}
            </div>
            {ret != null ? (
              <div className="text-small tabular-nums text-foreground/55">
                {stakeLine(s.market, ret).from} →{" "}
                <span className="font-semibold text-foreground">
                  {stakeLine(s.market, ret).to}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <h2 className="mt-5 text-heading text-balance text-foreground group-hover:text-brand-brown dark:group-hover:text-brand-tan">
          {s.headline}
        </h2>

        {/* No standfirst: it is frozen at publication ("62.87p now,
            +78.6%") and sat under the live return above it, so the card
            stated two different numbers for one move. The article carries
            both, labelled. */}

        <span className="mt-5 inline-flex items-center gap-1.5 text-label font-semibold text-foreground">
          Read the story
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </span>
      </div>

      {/* The picture: the price since the buy. Ruled off the text on the
          left from md, above it on a phone. */}
      <div className="flex flex-col justify-center border-t border-rule bg-black/[0.02] p-6 md:border-l md:border-t-0 dark:bg-white/[0.03]">
        <div className="micro text-muted">Price since the buy</div>
        <div className="mt-3">
          <BuySparkline
            bars={spark?.bars}
            bench={undefined}
            heightClass="h-28"
            row={anchor(spark?.tradeDate ?? "")}
          />
        </div>
      </div>
    </Link>
  );
}
