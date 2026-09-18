/** The story timeline — /stories.
 *
 *  Case articles: a researched follow-up on filings we already hold, a few
 *  weeks to a few months after the buy. What the price did, why it did it, and
 *  how the assessment we published at the time reads now.
 *
 *  Chronological, not an archive. The first cut split the list into "Latest"
 *  and "Archive", which was wrong twice: the section publishes twice a week, so
 *  nothing on the page is old enough to be archived, and a lead card plus a
 *  remainder hides the one thing the list is actually ordered by. It is a
 *  record with dates, so it reads as one.
 *
 *  Built on `BoardRow lead="date"` rather than a rail of its own, because that
 *  row IS the dated-record grammar this site already uses for a company's
 *  filings. Month rules give the timeline its scale: at two a week they land
 *  about every eight rows, which is the rhythm that makes a list read as a
 *  chronology rather than a feed.
 *
 *  Dated and permanent, for the same reason /reports is: an index that silently
 *  replaces last week's piece hands anyone linking to it a moving target.
 */
import type { StoryListItem } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";

import DefaultLayout from "@/layouts/default";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { BoardRow, BoardRowList } from "@/components/boards/board-row";
import { CompanyLogo } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { api } from "@/lib/api";
import { marketForPath } from "@/lib/markets/registry";
import { STORY_KIND_LABEL, storyPath } from "@/lib/stories";

/** The kind, as the row's kicker. STORY_KIND_LABEL entries are already
 *  phrases ("Since the buy", "Buying again"), so they read as a kicker and
 *  need no coloured pill to carry them. */
const KICKER =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand";

/** The month rule, in the counter style the section headers use. */
const COUNTER =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/35";

function parseDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The rail's date: "14 Sept", with the year only when it is not this one. */
function railDate(d: Date): string {
  const thisYear = d.getFullYear() === new Date().getFullYear();

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(thisYear ? {} : { year: "numeric" }),
  });
}

const monthLabel = (d: Date) =>
  d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

/** Display ticker: UK drops the `.L`, US is already bare. */
const display = (t: string) => t.replace(/\.L$/, "");

export default function StoriesPage() {
  // Host-aware, the same way /reports is: ddbx.us shows the US stories and
  // ddbx.uk the UK ones. One bundle serves both domains, so an unfiltered list
  // would show a reader on ddbx.us articles about UK filings reached through
  // navigation that does not exist on that host.
  const marketParam = useMemo(() => {
    const id = marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id;

    return id === "us" || id === "usg" || id === "djt" ? "US" : "UK";
  }, []);

  const [stories, setStories] = useState<StoryListItem[] | null>(null);

  useEffect(() => {
    let live = true;

    api
      .stories(marketParam)
      .then((r) => live && setStories(r.stories))
      .catch(() => live && setStories([]));

    return () => {
      live = false;
    };
  }, [marketParam]);

  const rows = stories ?? [];

  return (
    <DefaultLayout>
      <SeoPageShell
        crumbs={[{ label: "Stories" }]}
        eyebrow="Case studies"
        loading={stories === null}
        skeleton={<SeoSkeleton rows={10} variant="ruled-list" />}
        standfirst={
          <>
            When a director buy turns into something, we go back to it. What the
            price did, what actually caused it, and how the call we published at
            the time reads now, with every claim sourced.
          </>
        }
        title="Stories"
      >
        {rows.length === 0 ? (
          <p className="text-[14px] leading-[1.65] text-foreground/70">
            No stories published yet.
          </p>
        ) : (
          <BoardRowList className="mt-8">
            {rows.map((s, i) => {
              const when = parseDate(s.published_at);
              const prev = i > 0 ? parseDate(rows[i - 1].published_at) : null;
              const newMonth =
                when != null &&
                (prev == null ||
                  prev.getMonth() !== when.getMonth() ||
                  prev.getFullYear() !== when.getFullYear());
              const tickers = s.subject_tickers.length
                ? s.subject_tickers
                : s.subject_ticker
                  ? [s.subject_ticker]
                  : [];

              return (
                <div key={s.id}>
                  {newMonth && when ? (
                    <div
                      className={`${COUNTER} border-t border-hairline pb-1 pt-4 dark:border-separator`}
                    >
                      {monthLabel(when)}
                    </div>
                  ) : null}
                  <BoardRow
                    badge={
                      tickers.length === 1 ? (
                        <TickerPill ticker={display(tickers[0])} />
                      ) : undefined
                    }
                    date={
                      when
                        ? { iso: s.published_at ?? "", locale: railDate(when) }
                        : undefined
                    }
                    figure={
                      s.source_count > 0
                        ? {
                            srLabel: "external sources cited",
                            unit: s.source_count === 1 ? "source" : "sources",
                            value: s.source_count,
                          }
                        : undefined
                    }
                    logo={
                      /* Up to three, stacked. A sector story is about several
                         companies, and naming one of them with a single disc
                         would misdescribe it. */
                      <span className="flex items-center">
                        {tickers.slice(0, 3).map((t, n) => (
                          <CompanyLogo
                            key={t}
                            className={
                              n > 0 ? "-ml-3 ring-2 ring-background" : ""
                            }
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
                        <span className="mt-1 block text-[16.5px] font-medium leading-snug text-foreground">
                          {s.headline}
                        </span>
                      </span>
                    }
                    secondary={
                      s.standfirst ? (
                        <span className="line-clamp-2 text-[13.5px] leading-[1.55] text-foreground/70">
                          {s.standfirst}
                        </span>
                      ) : undefined
                    }
                    to={storyPath(s.id)}
                  />
                </div>
              );
            })}
          </BoardRowList>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}
