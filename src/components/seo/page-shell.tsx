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

import { useSectionEyebrow } from "@/lib/section";
import { AppCtaBand, type CtaMedia } from "@/components/seo/app-cta-band";
import { eyebrow as eyebrowClass } from "@/components/ui/eyebrow";

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

/** A page whose data failed to arrive — distinct from one whose data is
 *  empty (static-page rules: "empty and failed are different states"). */
export interface ShellError {
  /** What didn't load, finishing "Couldn’t load …": "this filing",
   *  "the platform data". */
  what: string;
  /** Replaces the default standfirst. Say whose fault it is and what the
   *  reader can do next; the default says both. */
  detail?: ReactNode;
}

const ERROR_DETAIL =
  "That’s a fault at our end rather than a missing record. Try a refresh in a moment, or browse from here.";

export function SeoPageShell({
  hero,
  back,
  eyebrow,
  crumbs,
  title,
  standfirst,
  standfirstSize = "body",
  notice,
  share,
  cta,
  width = "article",
  stage,
  titleInHero = false,
  loading = false,
  skeleton,
  error,
  children,
}: {
  /** An object that comes BEFORE the page's own furniture — above the back
   *  link, the crumbs and the eyebrow.
   *
   *  Two uses. The share route (/t/{id}) puts the notification above
   *  everything, because a stranger lands there cold from outside the site and
   *  everything the shell normally opens with — crumbs, family stamp, h1,
   *  standfirst — is orientation for a reader who already knows where they
   *  are; on a phone it pushed that object 400px down the page. The seven
   *  board and hub pages (/biggest-buys and the 2026-09 sweep:
   *  /best-performing-buys, /cluster-buys, /most-active-companies, /sectors,
   *  /market-cap, /roles) put their proof object here with `titleInHero`, so
   *  the h1 lives inside the panel and the shell renders none of its own
   *  header, eyebrow, standfirst OR notice — a page using `titleInHero` must
   *  render its notice content in `children`.
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
  /** "body" is the guide-page 14px grey (`text-body`); "lede" is the
   *  document standfirst (`text-lede`) for pages that open with a thesis. */
  standfirstSize?: "body" | "lede";
  /** TrackingNotice / truncation caveat slot, directly under the standfirst. */
  notice?: ReactNode;
  /** A `<ShareRow />`, rendered as the last item of the header furniture —
   *  under the standfirst and the notice, above the first content section.
   *
   *  The slot exists so the control lands in the SAME place on every page in
   *  the family rather than wherever each page happened to put it; that is the
   *  whole argument for it being a shell slot and not a component a page drops
   *  into `children`. Suppressed while `loading`, for the reason the terminal
   *  band is: a share control for a record that has not arrived can only offer
   *  the wrong link or a blank one, and it would be shoved down the page by
   *  the data anyway. A page with `titleInHero` renders its own — the shell
   *  draws no header furniture at all in that mode. */
  share?: ReactNode;
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
  /** The failed state. When set the shell renders one consistent header —
   *  h1 "Couldn’t load {what}", a standfirst saying the fault is ours — in
   *  place of `title` / `standfirst`, and drops everything that would
   *  describe a record it doesn't have: `hero`, `stage`, `notice`, `share`
   *  and the terminal band. `children` still render, so pass the page's
   *  "Browse instead" section (a `SeoSection` of `RelatedCards`) as the way
   *  out. Never use it for an empty record: that page says "Not enough data
   *  yet" and when there will be. */
  error?: ShellError | null;
  children: ReactNode;
}) {
  if (error) {
    title = `Couldn’t load ${error.what}`;
    standfirst = error.detail ?? ERROR_DETAIL;
    hero = undefined;
    stage = undefined;
    notice = undefined;
    share = undefined;
    cta = false;
    titleInHero = false;
    loading = false;
  }

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
  const sectionEyebrow = useSectionEyebrow(
    eyebrow,
    typeof title === "string" ? title : undefined,
  );

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
          {hero ? <div className="seo-hero pt-2">{hero}</div> : null}

          {back ? <div className={hero ? "mt-8" : "pt-2"}>{back}</div> : null}

          {crumbs && crumbs.length > 0 ? (
            <nav
              aria-label="Breadcrumb"
              className={`text-caption text-foreground/50 ${
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
                className={`${eyebrowClass("brand")} ${
                  (crumbs && crumbs.length > 0) || back
                    ? "mt-4"
                    : hero
                      ? "mt-8"
                      : "pt-2"
                }`}
              >
                {sectionEyebrow}
              </p>

              {/* The document h1 species, `display-doc` (34/44, weight 600) —
                  static-page rules §5. Stage pages carry `display-stage`
                  inside their own hero instead. */}
              <h1 className="mt-2 text-balance font-semibold text-foreground display-doc">
                {title}
              </h1>

              {standfirst ? (
                <p
                  className={
                    standfirstSize === "lede"
                      ? "mt-5 max-w-[58ch] text-lede text-foreground/75"
                      : "mt-4 max-w-measure text-body text-foreground/70"
                  }
                >
                  {standfirst}
                </p>
              ) : null}

              {notice ? (
                <div
                  className={width === "wide" ? "mt-3" : "mt-3 max-w-measure"}
                >
                  {notice}
                </div>
              ) : null}

              {share && !handoff ? <div className="mt-6">{share}</div> : null}
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
