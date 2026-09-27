/** The /stories header: the h1 inside a dark stage, the tally of every story
 *  published, and the latest one featured over its real price line.
 *
 *  The index was a bare list until 2026-09-27 — the one page in the family
 *  with no stage — and it read as an archive rather than a record anyone
 *  should care about. Two things make the case, and both are data:
 *
 *    1. The tally. How many stories, how many went up, the best and the WORST.
 *       The worst is the point: this section publishes its misses ("Our call,
 *       marked"), and a stage that only showed the best would be a brochure.
 *    2. The latest story, drawn: ticker, return, what £1,000 became, and the
 *       price path since the buy — the same chart the article opens on.
 *
 *  The chart needs the story's detail (`/api/stories/:id`), which the list
 *  doesn't carry. Its slot holds its height while that fetch is in flight so
 *  the list below doesn't jump, and a story with no anchoring chart simply
 *  shows no chart rather than an empty panel.
 */
import type { Story, StoryListItem } from "@/types/ddbx";
import type { StageFigure } from "@/components/boards/stage-figures";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { CompanyLogo } from "@/components/company-logo";
import { MiniPriceChart } from "@/components/mini-price-chart";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Skeleton } from "@/components/skeleton";
import { StageFigures } from "@/components/boards/stage-figures";
import { Stage, StageFooter } from "@/components/ui/stage";
import { STAGE_DEK, StageHeader } from "@/components/ui/stage-header";
import { stakeLine, storyTickers } from "@/components/stories/story-row";
import { api } from "@/lib/api";
import { GBP_FORMAT } from "@/lib/markets/uk";
import { USD_FORMAT } from "@/lib/markets/us";
import { STORY_KIND_LABEL, storyPath } from "@/lib/stories";

/** Same USD cents conversion StoryStage applies (see its note). */
const normalizeUsdClose = (closePence: number) => closePence / 100;

const display = (t: string) => t.replace(/\.L$/, "");

const signed = (pct: number) =>
  `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`;

/** The tally. Every slot is computed over the stories that carry a return;
 *  with none, the band is omitted rather than filled with zeros. */
function tally(stories: StoryListItem[]): StageFigure[] {
  const scored = stories.filter(
    (s): s is StoryListItem & { return_pct: number } => s.return_pct != null,
  );

  if (scored.length === 0) return [];

  const byReturn = [...scored].sort((a, b) => b.return_pct - a.return_pct);
  const best = byReturn[0];
  const worst = byReturn[byReturn.length - 1];
  const up = scored.filter((s) => s.return_pct > 0).length;
  const name = (s: StoryListItem) => {
    const t = storyTickers(s);

    return t.length === 1 ? display(t[0]) : "sector piece";
  };

  const figures: StageFigure[] = [
    { k: "Stories", v: String(stories.length) },
    { k: "Up since the buy", v: `${up} of ${scored.length}` },
    {
      k: `Best · ${name(best)}`,
      v: signed(best.return_pct),
      tone: best.return_pct >= 0 ? "pos" : "neg",
    },
  ];

  // Only when it's a different story from the best — one story is not a range.
  if (worst.id !== best.id) {
    figures.push({
      k: `Worst · ${name(worst)}`,
      v: signed(worst.return_pct),
      tone: worst.return_pct >= 0 ? "pos" : "neg",
    });
  }

  return figures;
}

export function StoriesStage({
  stories,
  standfirst,
}: {
  /** null while the list loads. */
  stories: StoryListItem[] | null;
  standfirst: React.ReactNode;
}) {
  const latest = stories?.[0] ?? null;
  const [detail, setDetail] = useState<Story | null | "none">(null);

  useEffect(() => {
    if (!latest) return;
    let live = true;

    setDetail(null);
    api
      .story(latest.id)
      .then((s) => live && setDetail(s))
      .catch(() => live && setDetail("none"));

    return () => {
      live = false;
    };
  }, [latest?.id]);

  const figures = stories ? tally(stories) : [];
  const chart = detail && detail !== "none" ? detail.chart : null;
  const chartPending = latest != null && detail === null;
  const isUs = chart?.market === "US";

  return (
    <Stage className="mt-2">
      <div className="px-6 pt-7 sm:px-8 sm:pt-9">
        <StageHeader
          dek={standfirst}
          eyebrow="Case studies"
          figures={<StageFigures items={figures} reserve={stories === null} />}
          title="Stories"
        />
      </div>

      {latest ? <LatestStory latest={latest} /> : null}

      {/* The latest story's price path, full-bleed like every stage object. */}
      {chart ? (
        <div className="mt-6 px-2 pb-1 sm:px-3">
          <MiniPriceChart
            detailed
            disclosedDate={chart.disclosed_date ?? undefined}
            entryPrice={chart.entry_price}
            fmt={isUs ? USD_FORMAT : GBP_FORMAT}
            normalizeClose={isUs ? normalizeUsdClose : undefined}
            preBuyDays={180}
            showFigures={false}
            theme="dark"
            tickerForApi={chart.ticker}
            tickerForDisplay={chart.ticker_display}
            tradeDate={chart.trade_date}
          />
        </div>
      ) : chartPending ? (
        <div className="mt-6 px-6 pb-6 sm:px-8">
          <Skeleton className="h-56 w-full rounded-card" />
        </div>
      ) : (
        <div className="pb-7 sm:pb-9" />
      )}

      {chart ? (
        <StageFooter className="sm:px-8">
          <span>{chart.caption}</span>
          <span className="text-white/45">
            {chart.ticker_display} · {chart.market}
          </span>
        </StageFooter>
      ) : null}
    </Stage>
  );
}

/** The featured story: logo, ticker, return and the £1,000 line, then the
 *  headline and the way in. Ruled off the header above it. */
function LatestStory({ latest }: { latest: StoryListItem }) {
  const tickers = storyTickers(latest);
  const single = tickers.length === 1 ? tickers[0] : null;
  const kind = STORY_KIND_LABEL[latest.kind] ?? latest.kind;
  const ret = latest.return_pct;

  return (
    <div className="mt-8 border-t border-rule-stage px-6 pt-6 sm:px-8">
      <Eyebrow tone="stage">{`Latest · ${kind}`}</Eyebrow>

      <div className="mt-4 flex items-center gap-4">
        {single ? (
          <CompanyLogo market={latest.market} size={56} ticker={single} />
        ) : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-heading font-semibold text-white">
              {single ? display(single) : kind}
            </span>
            {ret != null ? (
              <span
                className={`text-heading font-semibold tabular-nums ${
                  ret >= 0 ? "text-(--stage-pos)" : "text-(--stage-neg)"
                }`}
              >
                {signed(ret)}
              </span>
            ) : null}
          </div>
          {ret != null ? (
            <div className="mt-1 text-small tabular-nums text-white/55">
              {stakeLine(latest.market, ret).from} at the director&rsquo;s price
              is now{" "}
              <span className="font-semibold text-white">
                {stakeLine(latest.market, ret).to}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <p className={`mt-4 max-w-measure ${STAGE_DEK}`}>
        <Link
          className="text-white/85 transition-colors hover:text-white"
          data-ga-event="stories_latest_open"
          data-ga-label={latest.id}
          to={storyPath(latest.id)}
        >
          {latest.headline}
        </Link>
      </p>

      <Link
        className="mt-3 inline-flex items-center gap-1.5 text-label font-semibold text-white transition-colors hover:text-white/80"
        data-ga-event="stories_latest_read"
        data-ga-label={latest.id}
        to={storyPath(latest.id)}
      >
        Read the story <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
