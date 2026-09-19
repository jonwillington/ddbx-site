/** One story as a dated record row. Shared by the /stories timeline and the
 *  "More stories" list under an article, so the two can't drift apart.
 *
 *  The headline wraps in full (`wrapName`). It is a sentence, not a company
 *  name, and the kicker above it already spends one of BoardRow's two clamped
 *  lines, so a clamp cut most headlines off before their point. */
import type { StoryListItem } from "@/types/ddbx";

import { BoardRow } from "@/components/boards/board-row";
import { CompanyLogo } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { localeFor } from "@/lib/company-format";
import { STORY_KIND_LABEL, storyPath } from "@/lib/stories";

/** The kind, as the row's kicker. STORY_KIND_LABEL entries are already
 *  phrases ("Since the buy", "Buying again"), so they read as a kicker and
 *  need no coloured pill to carry them. */
const KICKER = "eyebrow text-brand";

/** Display ticker: UK drops the `.L`, US is already bare. */
const display = (t: string) => t.replace(/\.L$/, "");

export function storyTickers(s: StoryListItem): string[] {
  return s.subject_tickers.length
    ? s.subject_tickers
    : s.subject_ticker
      ? [s.subject_ticker]
      : [];
}

export function StoryRow({ story: s }: { story: StoryListItem }) {
  const tickers = storyTickers(s);

  return (
    <BoardRow
      wrapName
      badge={
        tickers.length === 1 ? (
          <TickerPill ticker={display(tickers[0])} />
        ) : undefined
      }
      /* `locale` is a BCP-47 tag, not a preformatted string: RowDate does the
         day/short-month rendering itself, and drops the year in unless it is
         a past one. */
      date={
        s.published_at
          ? { iso: s.published_at, locale: localeFor(s.market) }
          : undefined
      }
      /* The return since the buy is why the story exists, so it is the row's
         figure, in the direction's colour. The source count stands in only
         where the price panel can't resolve a return. */
      figure={
        s.return_pct != null
          ? {
              srLabel: "return since the buy",
              unit: "since the buy",
              value: (
                <span
                  className={
                    s.return_pct >= 0 ? "text-positive" : "text-negative"
                  }
                >
                  {s.return_pct >= 0 ? "+" : "−"}
                  {Math.abs(s.return_pct).toFixed(1)}%
                </span>
              ),
            }
          : s.source_count > 0
            ? {
                srLabel: "external sources cited",
                unit: s.source_count === 1 ? "source" : "sources",
                value: s.source_count,
              }
            : undefined
      }
      logo={
        /* Up to three, stacked. A sector story is about several companies,
           and naming one of them with a single disc would misdescribe it. */
        <span className="flex items-center">
          {tickers.slice(0, 3).map((t, n) => (
            <CompanyLogo
              key={t}
              className={n > 0 ? "-ml-3 ring-2 ring-background" : ""}
              market={s.market}
              size={56}
              ticker={t}
            />
          ))}
        </span>
      }
      name={
        <span className="block">
          <span className={`block ${KICKER}`}>
            {STORY_KIND_LABEL[s.kind] ?? s.kind}
          </span>
          <span className="mt-1 block text-lede font-medium leading-snug text-foreground">
            {s.headline}
          </span>
        </span>
      }
      /* No standfirst line: the headline, ticker and the return beside them
         already say what happened, and the sentence repeated the return in
         prose. The standfirst still leads the article itself. */
      to={storyPath(s.id)}
    />
  );
}
