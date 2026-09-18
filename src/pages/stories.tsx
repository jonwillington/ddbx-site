/** The story archive — /stories.
 *
 *  Case articles: a researched follow-up on filings we already hold, a few
 *  weeks to a few months after the buy. What the price did, why it did it, and
 *  how the assessment we published at the time reads now.
 *
 *  Dated and permanent, for the same reason /reports is: an index that silently
 *  replaces last week's article gives anyone linking to it a moving target.
 *  Every story keeps its own URL forever.
 *
 *  The articles are generated upstream and approved by hand before they appear
 *  here, so this page writes no prose of its own beyond the standfirst and the
 *  section furniture.
 */
import type { StoryListItem } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import DefaultLayout from "@/layouts/default";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { api } from "@/lib/api";
import { STORY_KIND_LABEL, storyPath } from "@/lib/stories";

const RULE = "border-hairline dark:border-separator";
const BODY = "text-[14px] leading-[1.65] text-foreground/70";

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

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryListItem[] | null>(null);

  useEffect(() => {
    let live = true;
    api
      .stories()
      .then((r) => live && setStories(r.stories))
      .catch(() => live && setStories([]));
    return () => {
      live = false;
    };
  }, []);

  const rows = stories ?? [];
  const lead = useMemo(() => rows[0], [rows]);
  const rest = useMemo(() => rows.slice(1), [rows]);

  return (
    <DefaultLayout>
      <SeoPageShell
        crumbs={[{ label: "Stories" }]}
        eyebrow="Case studies"
        loading={stories === null}
        skeleton={<SeoSkeleton rows={8} variant="ruled-list" />}
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
          <p className={BODY}>No stories published yet.</p>
        ) : (
          <>
            {lead ? (
              <SeoSection title="Latest">
                <Link
                  className={`block border-b ${RULE} pb-7 no-underline`}
                  to={storyPath(lead.id)}
                >
                  <div className="text-[12px] uppercase tracking-wide text-foreground/45">
                    {STORY_KIND_LABEL[lead.kind] ?? lead.kind}
                    {lead.published_at
                      ? ` · ${dateLabel(lead.published_at)}`
                      : ""}
                  </div>
                  <h2 className="mt-2 text-[22px] font-medium leading-snug text-foreground">
                    {lead.headline}
                  </h2>
                  {lead.standfirst ? (
                    <p className={`mt-2 ${BODY}`}>{lead.standfirst}</p>
                  ) : null}
                </Link>
              </SeoSection>
            ) : null}

            <SeoSection title="Archive">
              <ul className="m-0 list-none p-0">
                {rest.map((s) => (
                  <li key={s.id} className={`border-b ${RULE}`}>
                    <Link
                      className="block py-5 no-underline"
                      to={storyPath(s.id)}
                    >
                      <div className="text-[12px] text-foreground/45">
                        {STORY_KIND_LABEL[s.kind] ?? s.kind}
                        {s.published_at
                          ? ` · ${dateLabel(s.published_at)}`
                          : ""}
                        {s.market ? ` · ${s.market}` : ""}
                      </div>
                      <div className="mt-1 text-[16px] font-medium leading-snug text-foreground">
                        {s.headline}
                      </div>
                      {s.standfirst ? (
                        <div className={`mt-1 ${BODY}`}>{s.standfirst}</div>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </SeoSection>
          </>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}
