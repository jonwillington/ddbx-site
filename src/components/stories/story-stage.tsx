import type { Story } from "@/types/ddbx";

import { CompanyLogo } from "@/components/company-logo";
import { MiniPriceChart } from "@/components/mini-price-chart";
import { StageFigures } from "@/components/boards/stage-figures";
import { GBP_FORMAT } from "@/lib/markets/uk";
import { USD_FORMAT } from "@/lib/markets/us";
import { SectionEyebrow } from "@/components/section-eyebrow";
import { Stage, StageFooter } from "@/components/ui/stage";
import { STAGE_DEK, StageTitle } from "@/components/ui/stage-header";

/** Yahoo's USD bars land in the prices table as cents-times-FX while Form 4's
 *  `price` is in major dollars, so the US chart needs the same conversion the
 *  US filing page applies (markets/us.tsx). Defined here rather than exported
 *  from there because it lives inside that file's component closure. */
const normalizeUsdClose = (closePence: number) => closePence / 100;

/** The article's hero: the headline inside a dark stage over the price line the
 *  piece is about.
 *
 *  Every board page since 2026-09-05 puts its h1 inside a dark panel over the
 *  object that makes its argument, and a story's object is not in question: the
 *  price path since the buy, with the trade and disclosure marked on it. The
 *  rule that device came with is that the object must be real data, never
 *  decoration shaped like a chart, which is why a story with no single
 *  anchoring filing gets no panel at all rather than an empty one.
 *
 *  The figures band carries the receipt. "Our call" states the rating we
 *  published and when, "Since then" the return since that buy: the pair no
 *  other publication can print, because printing it requires having gone on
 *  record first. `StageFigures` drops any slot with no figure, so an unrated
 *  story simply shows fewer.
 */


function dateLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T"));

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);

  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export type ReturnBasis = "publish" | "today";

export function StoryStage({
  story,
  kindLabel,
  basis,
  onBasis,
}: {
  story: Story;
  kindLabel: string;
  basis: ReturnBasis;
  onBasis: (b: ReturnBasis) => void;
}) {
  const chart = story.chart;

  if (!chart) return null;

  const isUs = chart.market === "US";

  // The receipt. Both halves come from the same buy the chart is anchored on,
  // so the grade and the outcome are measured from one point rather than two.
  const anchor = story.buys.find((b) => b.trade_date === chart.trade_date);
  const rated = story.buys.find((b) => b.rating);
  // Which "now" the figure means. The prose is frozen at publication ("the
  // stock is now 157p"), so a page that only ever showed the live number would
  // contradict its own first paragraph a week later. Both are carried and the
  // label always says which one is on screen.
  const ret =
    basis === "today" ? anchor?.return_pct : anchor?.return_pct_at_publish;
  const figures = [
    rated?.rating
      ? {
          k: "Our call",
          v: `${rated.rating[0].toUpperCase()}${rated.rating.slice(1)}, ${shortDate(rated.trade_date)}`,
        }
      : null,
    ret != null
      ? {
          k:
            basis === "today"
              ? "Since then, today"
              : "Since then, at publication",
          tone: (ret >= 0 ? "pos" : "neg") as "pos" | "neg",
          v: `${ret >= 0 ? "+" : ""}${ret.toFixed(1)}%`,
        }
      : null,
    story.buys.length > 1
      ? {
          k: "Insiders buying",
          v: String(new Set(story.buys.map((b) => b.director)).size),
        }
      : null,
  ].filter(Boolean) as Array<{ k: string; v: string; tone?: "pos" | "neg" }>;

  return (
    <Stage className="story-stage mt-8">
      <div className="px-6 pt-7 sm:px-8 sm:pt-9">
        <SectionEyebrow tone="stage">
          {story.published_at
            ? `${kindLabel} · ${dateLabel(story.published_at)}`
            : kindLabel}
        </SectionEyebrow>

        {/* Stacked, not inline. At 80px the mark is the company's own
            identity rather than a bullet beside the text, and the headline
            keeps a measure instead of running the full width of the panel:
            a 44px line set across 900px is a banner, not a sentence. */}
        <CompanyLogo
          className="mt-5"
          market={chart.market}
          size={80}
          ticker={chart.ticker}
        />

        <StageTitle className="mt-5 max-w-[19ch] sm:max-w-[17ch]">
          {story.headline}
        </StageTitle>

        {story.standfirst ? (
          <p className={`mt-4 max-w-[58ch] ${STAGE_DEK}`}>
            {story.standfirst}
          </p>
        ) : null}

        {figures.length > 0 ? <StageFigures items={figures} /> : null}

        {/* One control for the whole page: the table below follows it. */}
        {anchor?.return_pct != null && anchor?.return_pct_at_publish != null ? (
          <div className="mt-6 inline-flex rounded-full border border-white/15 p-0.5 text-[11px]">
            {(
              [
                ["publish", "At publication"],
                ["today", "Today"],
              ] as Array<[ReturnBasis, string]>
            ).map(([k, lbl]) => (
              <button
                key={k}
                className={`rounded-full px-3 py-1 transition-colors ${
                  basis === k
                    ? "bg-white/15 text-white"
                    : "text-white/55 hover:text-white/80"
                }`}
                type="button"
                onClick={() => onBasis(k)}
              >
                {lbl}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Full-bleed under the header, the way every stage puts its object. */}
      <div className="mt-8 px-2 pb-1 sm:px-3">
        <MiniPriceChart
          detailed
          disclosedDate={chart.disclosed_date ?? undefined}
          entryPrice={chart.entry_price}
          fmt={isUs ? USD_FORMAT : GBP_FORMAT}
          normalizeClose={isUs ? normalizeUsdClose : undefined}
          /* Six months of run-up before the buy. The grey leg is the price the
             director chose to step into, which is half of what the article is
             about; at the filing page's five days it is a stub. */
          preBuyDays={180}
          showFigures={false}
          theme="dark"
          tickerForApi={chart.ticker}
          tickerForDisplay={chart.ticker_display}
          tradeDate={chart.trade_date}
        />
      </div>

      <StageFooter>
        <span>{chart.caption}</span>
        <span className="text-white/45">
          {chart.ticker_display} · {chart.market}
        </span>
      </StageFooter>
    </Stage>
  );
}
