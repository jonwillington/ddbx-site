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
import type { ShotSlot } from "@/lib/app-screenshots";

import { Link } from "react-router-dom";

import { AppCtaBand, type CtaMedia } from "@/components/seo/app-cta-band";

export interface ShellCrumb {
  label: string;
  /** Omit on the last crumb — it renders as plain text with aria-current. */
  to?: string;
}

export interface ShellCta {
  headline: ReactNode;
  body: ReactNode;
  gaLabel: string;
  marketId: "uk" | "us";
  media?: CtaMedia;
  screenshotSlot?: ShotSlot;
}

export function SeoPageShell({
  eyebrow,
  crumbs,
  title,
  standfirst,
  standfirstSize = "body",
  notice,
  cta,
  width = "article",
  loading = false,
  skeleton,
  children,
}: {
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
  /** While true, `skeleton` replaces children and the band is suppressed so
   *  nothing below the fold pre-renders and then jumps. */
  loading?: boolean;
  skeleton?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto w-full pb-16 ${
        width === "article" ? "max-w-[860px]" : ""
      }`}
    >
      {crumbs && crumbs.length > 0 ? (
        <nav
          aria-label="Breadcrumb"
          className="pt-2 text-[11px] leading-[1.5] text-foreground/50"
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

      <p
        className={`font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan ${
          crumbs && crumbs.length > 0 ? "mt-4" : "pt-2"
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
        <div className={width === "wide" ? "mt-3" : "mt-3 max-w-[62ch]"}>
          {notice}
        </div>
      ) : null}

      {loading ? (
        (skeleton ?? null)
      ) : (
        <>
          {children}

          {cta ? (
            <AppCtaBand
              body={cta.body}
              gaLabel={cta.gaLabel}
              headline={cta.headline}
              marketId={cta.marketId}
              media={cta.media}
              screenshotSlot={cta.screenshotSlot}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
