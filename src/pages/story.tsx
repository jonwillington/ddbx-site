/** One story — /stories/:id.
 *
 *  The page's order is the argument's order: the object, then the evidence,
 *  then the writing about it.
 *
 *  1. The stage. The headline sits inside a dark panel over the price line the
 *     piece is about, with the trade and disclosure marked, and the receipt in
 *     the figures band (what we rated it, what it has done since). Every board
 *     page since 2026-09-05 puts its h1 over the object that makes its
 *     argument; a story's object is the price path.
 *  2. The byline, which says plainly how the piece was made.
 *  3. The human take, when there is one. It is the loudest sentence on the page
 *     because it is the only one a person wrote by hand.
 *  4. The purchases. Above the prose, not below it: the reader's first question
 *     is who bought and where it stands, and the writing argues about those
 *     rows.
 *  5. The body, then the sources it cites.
 *
 *  A story with no single anchoring filing (a sector piece spans several
 *  companies) gets no stage rather than an empty one, and falls back to the
 *  shell's own header.
 */
import type { Story } from "@/types/ddbx";

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import DefaultLayout from "@/layouts/default";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { StoryBody } from "@/components/stories/story-body";
import { StoryBuys } from "@/components/stories/story-buys";
import { StoryStage, type ReturnBasis } from "@/components/stories/story-stage";
import { api } from "@/lib/api";
import { STORY_KIND_LABEL } from "@/lib/stories";

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

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<Story | null | "missing">(null);
  // Defaults to publication, so the figures agree with the prose a reader is
  // about to read. "Today" is one tap away and always labelled.
  const [basis, setBasis] = useState<ReturnBasis>("publish");

  useEffect(() => {
    if (!id) return;
    let live = true;

    api
      .story(id)
      .then((s) => live && setStory(s))
      .catch(() => live && setStory("missing"));

    return () => {
      live = false;
    };
  }, [id]);

  if (story === "missing") {
    return (
      <DefaultLayout>
        <SeoPageShell
          crumbs={[{ label: "Stories", to: "/stories" }]}
          eyebrow="Stories"
          title="Not found"
        >
          <p className="text-[14px] text-foreground/70">
            That story does not exist or has not been published.{" "}
            <Link to="/stories">Back to the timeline</Link>.
          </p>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const s = story;
  const kindLabel = s ? (STORY_KIND_LABEL[s.kind] ?? s.kind) : "Story";
  const staged = !!s?.chart;

  return (
    <DefaultLayout>
      <SeoPageShell
        /* A staged story opens on its stage, which carries the eyebrow
           ("Stories · Since the buy · date"), the headline and the
           standfirst, so the shell prints none of its own furniture above
           it — a crumb and a second eyebrow on a strip of cream read as a
           stray header. Unstaged stories keep the plain document header. */
        crumbs={
          staged
            ? undefined
            : [{ label: "Stories", to: "/stories" }, { label: "Article" }]
        }
        eyebrow={
          s?.published_at
            ? `${kindLabel} · ${dateLabel(s.published_at)}`
            : kindLabel
        }
        hero={
          s && staged ? (
            <StoryStage
              basis={basis}
              kindLabel={kindLabel}
              story={s}
              onBasis={setBasis}
            />
          ) : undefined
        }
        loading={s === null}
        skeleton={<SeoSkeleton rows={14} variant="ruled-list" />}
        standfirst={staged ? undefined : (s?.standfirst ?? undefined)}
        title={staged ? "" : (s?.headline ?? "")}
        titleInHero={staged}
      >
        {s ? (
          <>
            <p className="mt-5 text-[12.5px] leading-[1.6] text-foreground/45">
              {s.published_at ? `Published ${dateLabel(s.published_at)}. ` : ""}
              Researched and drafted with AI assistance, approved by hand before
              publication. Not investment advice.
            </p>

            {s.take ? (
              <p className="mt-8 text-[19px] leading-[1.5] text-foreground/90 sm:text-[22px]">
                {s.take}
              </p>
            ) : null}

            <StoryBuys basis={basis} story={s} />

            <div className="mt-9 max-w-[62ch]">
              <StoryBody markdown={s.body_md} />
            </div>

            {s.sources.length > 0 ? (
              <SeoSection title="Sources">
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-foreground/60">
                  {s.sources.map((src) => (
                    <li key={src.url}>
                      <a
                        className="underline decoration-hairline underline-offset-2"
                        href={src.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {src.title || src.url}
                      </a>
                      {src.publisher ? (
                        <span className="text-foreground/40">
                          {" "}
                          · {src.publisher}
                        </span>
                      ) : null}
                      {src.date ? (
                        <span className="text-foreground/40">
                          {" "}
                          · {src.date}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </SeoSection>
            ) : null}
          </>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}
