/** One story as a dated record row. Shared by the /stories timeline and the
 *  "More stories" list under an article, so the two can't drift apart.
 *
 *  ─── What leads the row ──────────────────────────────────────────────────
 *
 *  The ticker and the move since the buy, on one line, at the row's largest
 *  size. Jon, 2026-09-20: "the ticker and the price movement is the story —
 *  the text string is like a description, as it is longer." Until now this
 *  row led on the headline (a full sentence, wrapping to three lines) with
 *  the ticker demoted to a pill beside it and the return parked in a column
 *  on the far right, which is the wrong order twice: a reader scanning a
 *  chronology is looking for WHICH COMPANY and WHETHER IT WENT ANYWHERE, and
 *  both of those were the two smallest things on the row.
 *
 *  Ported from `ArticleRow` in ddbx-ios-app
 *  (Features/Articles/ArticlesView.swift), which already settled this:
 *
 *      PXEN  +111.1%          ← ticker (mono) + return, one baseline
 *      14 Sept · SINCE THE BUY ← date, then the kind as a kicker
 *      Prospex Energy doubled after the CEO bought twice at 52-week lows…
 *                              ← the headline, muted, as the description
 *
 *  A sector piece names no single company, so its kind takes the lead line
 *  where a ticker would be — same fallback iOS makes.
 *
 *  The return therefore leaves BoardRow's right-hand `figure` column: stating
 *  it twice on one row was the old shape's other problem. The source count,
 *  which only ever stood in where no return resolves, moves to the meta line
 *  for the same reason.
 */
import type { StoryListItem } from "@/types/ddbx";

import { BoardRow } from "@/components/boards/board-row";
import { CompanyLogo } from "@/components/company-logo";
import { Delta } from "@/components/ui/delta";
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
  const kind = STORY_KIND_LABEL[s.kind] ?? s.kind;
  // One company: the ticker is the subject and leads. Several: naming one of
  // them would misdescribe the piece, so the kind leads instead.
  const single = tickers.length === 1 ? display(tickers[0]) : null;

  return (
    <BoardRow
      /* `locale` is a BCP-47 tag, not a preformatted string: RowDate does the
         day/short-month rendering itself, and drops the year in unless it is
         a past one. */
      date={
        s.published_at
          ? { iso: s.published_at, locale: localeFor(s.market) }
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
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-subheading font-semibold text-foreground">
              {single ?? kind}
            </span>
            {s.return_pct != null ? (
              <Delta
                aria-label={`Return since the buy: ${s.return_pct}%`}
                className="font-semibold"
                size="title"
                value={s.return_pct}
              />
            ) : null}
          </span>
          {/* The kind as a kicker UNDER the lead, where iOS puts it. On a
              multi-ticker piece the kind has already taken the lead line, so
              this carries the source count instead — the figure that stands
              in for a return the price panel can't resolve. */}
          <span className="mt-1 block">
            {single ? (
              <span className={KICKER}>{kind}</span>
            ) : s.source_count > 0 ? (
              <span className="text-caption text-foreground/55">
                {s.source_count} {s.source_count === 1 ? "source" : "sources"}
              </span>
            ) : null}
          </span>
          {/* The headline is the description now: three lines at most, so a
              long one cannot push the next row's ticker off a phone screen. */}
          <span className="mt-2 block line-clamp-3 text-body leading-snug text-foreground/75">
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
