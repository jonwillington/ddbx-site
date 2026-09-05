/** The one shell every SEO page composes — eyebrow, crumbs, h1, standfirst,
 *  notice, content, terminal band, in that order, always.
 *
 *  Before this existed the family had five standfirst species, zero family
 *  eyebrows and two pages with the conversion band in the middle of the
 *  document. The shell makes the ordering mechanical: the band always sits
 *  after the last content section, and while the page is loading the band is
 *  suppressed entirely — a dark full-bleed ask flashing above the fold and
 *  then being shoved 1,500px down by arriving data was the family's single
 *  worst loading behaviour.
 *
 *  There was a ruled `footnote` slot here too, carrying a line of small print
 *  under the band. It went because on most of the family it restated the
 *  standfirst in grey; the pages that had something real to say (a licence
 *  attribution, an affiliate compliance note) now say it in the body, where it
 *  is read rather than skipped.
 *
 *  The eyebrow is the family stamp ("Sector hub", "Glossary", "Broker guide").
 *  It is deliberately the same mono brown kicker the download page and app
 *  pitch use — one line that no scraped content-farm page has, which is the
 *  cheapest possible way to file these pages as part of the site.
 *
 *  Pair with `<DefaultLayout drawerRight>` + `<SeoRail …>` in the page; the
 *  shell owns everything inside the content column.
 */
import type { ReactNode } from "react";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AppCtaBand, type CtaMedia } from "@/components/seo/app-cta-band";

export interface ShellCrumb {
  /** Usually a string; a loading page may pass a small <Skeleton /> so the
   *  trail never states a placeholder word while the record is in flight. */
  label: ReactNode;
  /** Omit on the last crumb — it renders as plain text with aria-current. */
  to?: string;
}

export interface ShellCta {
  headline: ReactNode;
  body: ReactNode;
  gaLabel: string;
  marketId: "uk" | "us";
  media?: CtaMedia;
}

export function SeoPageShell({
  hero,
  back,
  eyebrow,
  crumbs,
  title,
  standfirst,
  standfirstSize = "body",
  notice,
  cta,
  width = "article",
  stage,
  titleInHero = false,
  loading = false,
  skeleton,
  children,
}: {
  /** An object that comes BEFORE the page's own furniture — above the back
   *  link, the crumbs and the eyebrow.
   *
   *  Deliberately narrow in intent, and empty on every page in the family bar
   *  one. The share route (/t/{id}) is the only surface here that a stranger
   *  lands on cold from outside the site, and it has one job above the fold
   *  that the ordering below cannot serve: show the notification. Everything
   *  the shell normally opens with — crumbs, family stamp, h1, standfirst —
   *  is orientation for a reader who already knows where they are, and on a
   *  phone it pushed that object 400px down the page.
   *
   *  It is not a general "put anything at the top" hatch. A page that wants
   *  its content noticed sooner should shorten its standfirst; this exists for
   *  the case where the first object is the argument and the prose is the
   *  footnote. */
  hero?: ReactNode;
  /** Optional return control, rendered above the crumbs. Distinct from them:
   *  crumbs are the site's structure ("Companies / Hercules / this filing") and
   *  are always true, whereas back is the reader's own history and is only
   *  honest when they arrived from inside the site. `BackLink` decides that
   *  for itself and renders nothing when they didn't, so passing it
   *  unconditionally is safe. */
  back?: ReactNode;
  /** Family stamp — "Sector hub", "Leaderboard", "Glossary", "Report",
   *  "Broker guide", "Company index". */
  eyebrow: string;
  crumbs?: ShellCrumb[];
  title: ReactNode;
  standfirst?: ReactNode;
  /** "body" is the guide-page 14px grey; "lede" is the document standfirst
   *  (16.5px/85) for pages that open with a stated thesis. */
  standfirstSize?: "body" | "lede";
  /** TrackingNotice / truncation caveat slot, directly under the standfirst. */
  notice?: ReactNode;
  /** The terminal AppCtaBand. Omit only for error / empty boards that should
   *  not ask (e.g. an invalid year on /biggest-buys). Broker guides pass a
   *  quiet band with `media: "none"` so the affiliate ask stays primary. */
  cta?: ShellCta | false;
  /** "article" = the 860px document measure; "wide" = the full column, for
   *  the broker guides whose ruled sections span the shell. */
  width?: "article" | "wide";
  /** A proof object beside the header — a chart, a stage — on wide pages.
   *  The header block becomes the message column and the stage sits to its
   *  right from `lg`, stacking beneath it before that. Never rendered over
   *  the title: message layer and proof layer are separate objects. */
  stage?: ReactNode;
  /** The page's own hero carries the h1 (and eyebrow, standfirst, figures)
   *  inside a proof object, so the shell renders `hero` and nothing of its
   *  own header. `title` still names the page for the shell's callers; the
   *  page must render it as the document's h1 inside `hero`. */
  titleInHero?: boolean;
  /** While true, `skeleton` replaces children and the band is suppressed so
   *  nothing below the fold pre-renders and then jumps. */
  loading?: boolean;
  skeleton?: ReactNode;
  children: ReactNode;
}) {
  // The skeleton outlives `loading` by the length of its fade so the two can
  // overlap. Without this the swap is a cut: skeleton unmounts, content mounts
  // mid-fade, and the reader gets an empty frame between them.
  const [holdSkeleton, setHoldSkeleton] = useState(loading);

  useEffect(() => {
    if (loading) {
      setHoldSkeleton(true);

      return;
    }
    if (!holdSkeleton) return;
    // Matches .animate-skeleton-out in globals.css.
    const t = window.setTimeout(() => setHoldSkeleton(false), 260);

    return () => window.clearTimeout(t);
  }, [loading, holdSkeleton]);

  const handoff = loading || holdSkeleton;

  // The article measure applies to the DOCUMENT — furniture, standfirst,
  // sections — not to the terminal band. The band is a conversion surface,
  // not prose: held to the 860px measure it read as one more boxed section,
  // so it spans the full column the rail leaves free while everything above
  // it keeps the reading width.
  const measure = width === "article" ? "mx-auto w-full max-w-[860px]" : "";

  const body = (
    <>
      <div className={measure}>{children}</div>

      {cta ? (
        <AppCtaBand
          body={cta.body}
          gaLabel={cta.gaLabel}
          headline={cta.headline}
          marketId={cta.marketId}
          media={cta.media}
        />
      ) : null}
    </>
  );

  const headerWrap = stage
    ? "grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center"
    : "";

  return (
    <div className="w-full pb-16">
      <div className={`${measure} ${headerWrap}`}>
        <div>
          {hero ? <div className="pt-2">{hero}</div> : null}

          {back ? <div className={hero ? "mt-8" : "pt-2"}>{back}</div> : null}

          {crumbs && crumbs.length > 0 ? (
            <nav
              aria-label="Breadcrumb"
              className={`text-[11px] leading-[1.5] text-foreground/50 ${
                back ? "mt-2" : hero ? "mt-8" : "pt-2"
              }`}
            >
              {crumbs.map((c, i) => (
                <span key={`${c.label}-${i}`}>
                  {i > 0 ? <span className="mx-1.5 opacity-40">/</span> : null}
                  {c.to ? (
                    <Link
                      className="transition-colors hover:text-foreground"
                      to={c.to}
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : null}

          {titleInHero ? null : (
            <>
              <p
                className={`font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan ${
                  (crumbs && crumbs.length > 0) || back
                    ? "mt-4"
                    : hero
                      ? "mt-8"
                      : "pt-2"
                }`}
              >
                {eyebrow}
              </p>

              {/* Levelled off /api's hero h1 (34/44/58). Stepped to 34/44 for the
          860px document measure: the top rung is for a full-width marketing
          hero, not a column with a rail beside it. Supersedes the 30/38
          "guide page" species in the 2026-07-27 type conventions — the
          record-page species (28/34, company and broker detail) is unchanged. */}
              <h1 className="mt-2 text-balance text-[34px] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground sm:text-[44px]">
                {title}
              </h1>

              {standfirst ? (
                <p
                  className={
                    standfirstSize === "lede"
                      ? "mt-5 max-w-[58ch] text-[16.5px] leading-[1.55] tracking-[-0.006em] text-foreground/75"
                      : "mt-4 max-w-[62ch] text-[14px] leading-[1.65] text-foreground/70"
                  }
                >
                  {standfirst}
                </p>
              ) : null}

              {notice ? (
                <div
                  className={width === "wide" ? "mt-3" : "mt-3 max-w-[62ch]"}
                >
                  {notice}
                </div>
              ) : null}
            </>
          )}
        </div>
        {stage ? <div className="min-w-0 pt-2 lg:pt-6">{stage}</div> : null}
      </div>

      {handoff ? (
        /* Cross-fade, not a cut. Both halves occupy the SAME grid cell, so the
           arriving document fades up through the departing skeleton instead of
           the skeleton being yanked away to leave a blank frame for a beat.
           The cell is only occupied by both for the length of
           .animate-skeleton-out; after that the skeleton unmounts and the
           branch below takes over. */
        <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
          {loading ? null : <div className="animate-content-in">{body}</div>}
          <div
            aria-hidden
            className={
              loading ? "" : "animate-skeleton-out pointer-events-none"
            }
          >
            <div className={measure}>{skeleton ?? null}</div>
          </div>
        </div>
      ) : (
        body
      )}
    </div>
  );
}
