/** One story — /stories/:id.
 *
 *  The article itself. The body is markdown authored upstream and rendered by
 *  `StoryBody`, which resolves the `ddbx://` links in it to real routes on this
 *  site (a filing link goes to /t/:id, a company link to /company/:key) and
 *  opens external citations in a new tab.
 *
 *  The sources block at the foot is not decoration. Every causal claim in the
 *  body is linked, and this page lists what it was linked to, because an
 *  article that says why a stock moved is only worth reading if you can check
 *  it.
 */
import type { Story } from "@/types/ddbx";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import DefaultLayout from "@/layouts/default";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { StoryBody } from "@/components/stories/story-body";
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
            <Link to="/stories">Back to the archive</Link>.
          </p>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const s = story;

  return (
    <DefaultLayout>
      <SeoPageShell
        crumbs={[{ label: "Stories", to: "/stories" }, { label: "Article" }]}
        eyebrow={
          s
            ? `${STORY_KIND_LABEL[s.kind] ?? s.kind}${
                s.published_at ? ` · ${dateLabel(s.published_at)}` : ""
              }`
            : "Story"
        }
        loading={s === null}
        skeleton={<SeoSkeleton rows={14} variant="ruled-list" />}
        standfirst={s?.standfirst ?? undefined}
        title={s?.headline ?? ""}
      >
        {s ? (
          <>
            {s.take ? (
              <p className="mb-8 border-l-2 border-foreground/30 pl-4 text-[16px] leading-relaxed text-foreground">
                {s.take}
              </p>
            ) : null}

            <StoryBody markdown={s.body_md} />

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
                        <span className="text-foreground/40"> · {src.date}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </SeoSection>
            ) : null}

            <p className="mt-10 text-[12px] text-foreground/40">
              Not financial advice.
            </p>
          </>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}
