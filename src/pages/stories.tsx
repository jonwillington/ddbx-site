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
import { BoardRowList } from "@/components/boards/board-row";
import { StoryRow } from "@/components/stories/story-row";
import { api } from "@/lib/api";
import { marketForPath } from "@/lib/markets/registry";

/** The month rule, in the counter style the section headers use. */
const COUNTER = "eyebrow text-foreground/35";

function parseDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso.replace(" ", "T"));

  return Number.isNaN(d.getTime()) ? null : d;
}

const monthLabel = (d: Date) =>
  d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

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
          <p className="text-body text-foreground/70">
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

              return (
                <div key={s.id}>
                  {newMonth && when ? (
                    <div
                      className={`${COUNTER} border-t border-rule pb-1 pt-4`}
                    >
                      {monthLabel(when)}
                    </div>
                  ) : null}
                  <StoryRow story={s} />
                </div>
              );
            })}
          </BoardRowList>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}
