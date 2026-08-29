/** The weekly digest archive — /weekly — and one week — /weekly/:week.
 *
 *  Both exports live here because they are the same document at two scopes and
 *  share every helper, exactly as learn.tsx does for the glossary.
 *
 *  /weekly is the INDEX, not "this week". shared/weeks.js explains why at
 *  length; the short version is that an undated current-week page and its own
 *  dated URL would be byte-identical for seven days, and folding one onto the
 *  other needs the edge to know which week is current, which is a canonical
 *  that rots every Monday.
 *
 *  The content is authored upstream. `WeeklyCards` renders the digest's own
 *  copy and writes none of its own, so the only prose this file contributes is
 *  the standfirst and the section furniture.
 */
import type { WeeklyDigest } from "@/types/ddbx";
import type { WeekIndexEntry } from "../../shared/weeks";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  archiveLeadSentence,
  numbersCard,
  weekLabel,
  weekLeadSentence,
  weekMeetsBar,
  weekPath,
} from "../../shared/weeks.js";
import { money } from "../../shared/filings.js";

import { WeeklyCards } from "@/components/weekly/weekly-cards";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { api } from "@/lib/api";
import { marketForPath } from "@/lib/markets/registry";

const R = {
  body: "text-[14px] leading-[1.65] text-foreground/70",
  label: "text-[12px] text-foreground/45",
};
const RULE = "border-hairline dark:border-separator";

/** The digest exists for UK and US only (WEEKLY_DIGEST_MARKETS in ddbx-data).
 *  Every other market's host falls back to UK rather than rendering an empty
 *  archive, which is how the other research surfaces already behave on
 *  ddbx.eu. Resolved from the host exactly as `useSectorMarket` does, so the
 *  two families agree about which market a domain is. */
function useDigestMarket() {
  return useMemo(() => {
    const id = marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id;
    const us = id === "us" || id === "usg" || id === "djt";

    return us
      ? { id: "US", label: "US", currency: "USD" }
      : { id: "UK", label: "UK", currency: "GBP" };
  }, []);
}

const CTA = {
  headline: "Next week’s, before it’s a week old.",
  body: "This archive is the record after the fact. The app is the running version: every disclosure the day it files, so you see the week as it happens rather than reading it on Friday.",
};

/* ─── /weekly ────────────────────────────────────────────────────────────── */

export function WeeklyIndexPage() {
  const market = useDigestMarket();
  const [weeks, setWeeks] = useState<WeekIndexEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    api
      .weeklyDigests(market.id)
      .then((r) => {
        if (!live) return;
        setWeeks(r.weeks);
        setFailed(false);
      })
      .catch(() => {
        if (!live) return;
        setWeeks([]);
        setFailed(true);
      });

    return () => {
      live = false;
    };
  }, [market.id]);

  const rows = weeks ?? [];

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={market.id === "US" ? "us" : "uk"}
        placement="weekly_rail"
      />
      <SeoPageShell
        crumbs={[{ label: "Weekly" }]}
        cta={{
          body: CTA.body,
          gaLabel: "Weekly index",
          headline: CTA.headline,
          marketId: market.id === "US" ? "us" : "uk",
          screenshotSlot: "analysis",
        }}
        eyebrow="Weekly digest"
        loading={weeks === null}
        skeleton={<SeoSkeleton rows={12} variant="ruled-list" />}
        standfirst={
          rows.length > 0
            ? archiveLeadSentence(rows, market.label)
            : "A short read on each week of disclosed insider buying: how much, who, and which sectors it went into."
        }
        standfirstSize="lede"
        title={`${market.label} insider buying, week by week`}
      >
        {failed ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the archive just now. That’s a fault at our end
            rather than an empty record. Try again shortly.
          </p>
        ) : rows.length === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            No weeks published yet for {market.label}.
          </p>
        ) : (
          <>
            <SeoSection
              aside="Newest first. A week with nothing worth reporting doesn’t get an entry."
              title="Every week"
            >
              <ul className={`mt-4 border-t ${RULE}`}>
                {rows.map((w) => (
                  <li key={w.week_start} className={`border-b ${RULE}`}>
                    <Link
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5 transition-colors hover:bg-foreground/[0.02]"
                      to={weekPath(w.week_start)}
                    >
                      <span className="text-[14.5px] font-medium text-foreground">
                        {weekLabel(w.week_start, w.week_end)}
                      </span>
                      <span className={R.label}>
                        {w.buy_count}{" "}
                        {w.buy_count === 1 ? "disclosed buy" : "disclosed buys"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SeoSection>

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards
                cols={2}
                items={[
                  {
                    to: "/reports",
                    title: "Monthly reports",
                    description:
                      "The longer view: what the month added up to, and how earlier picks actually performed.",
                  },
                  {
                    to: "/biggest-buys",
                    title: "The biggest buys",
                    description:
                      "The largest purchases insiders have made in their own companies.",
                  },
                  {
                    to: "/sectors",
                    title: "By sector",
                    description:
                      "Where insiders are buying, and how each sector’s buys have done against the market.",
                  },
                  {
                    to: "/companies",
                    title: "Every company",
                    description:
                      "Each issuer with disclosed insider buying, and the filings behind it.",
                  },
                ]}
              />
            </SeoSection>
          </>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}

/* ─── /weekly/:week ──────────────────────────────────────────────────────── */

export default function WeeklyWeekPage() {
  const { week } = useParams<{ week: string }>();
  const market = useDigestMarket();
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [weeks, setWeeks] = useState<WeekIndexEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "missing" | "failed">(
    "loading",
  );

  useEffect(() => {
    if (!week) {
      setStatus("missing");

      return;
    }

    let live = true;

    setStatus("loading");
    api
      .weeklyDigest(market.id, week)
      .then((r) => {
        if (!live) return;
        setDigest(r.digest);
        setStatus(weekMeetsBar(r.digest) ? "ok" : "missing");
      })
      .catch(() => {
        if (!live) return;
        setStatus("failed");
      });

    // The prev/next rail. Its failure costs navigation, not the document.
    api
      .weeklyDigests(market.id)
      .then((r) => live && setWeeks(r.weeks))
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [market.id, week]);

  if (status === "missing" || status === "failed") {
    return (
      <DefaultLayout drawerRight>
        <SeoRail
          marketId={market.id === "US" ? "us" : "uk"}
          placement="weekly_rail"
        />
        <SeoPageShell
          crumbs={[
            { label: "Weekly", to: "/weekly" },
            { label: status === "missing" ? "Not found" : "Unavailable" },
          ]}
          eyebrow="Weekly digest"
          standfirst={
            status === "missing"
              ? "We publish a digest for each week with enough disclosed buying to describe. That week either had none, or the address is wrong, the weeks we do publish are in the archive."
              : "We couldn’t load this week just now. That’s a fault at our end rather than a quiet week."
          }
          title={
            status === "missing"
              ? "No digest for that week"
              : "Couldn’t load this week"
          }
        >
          <SeoSection aside="Every week we publish." title="The archive">
            <RelatedCards
              cols={2}
              items={[
                {
                  to: "/weekly",
                  title: "Weekly archive",
                  description:
                    "Every week of disclosed insider buying, newest first.",
                },
                {
                  to: "/reports",
                  title: "Monthly reports",
                  description:
                    "The longer view, with how earlier picks actually performed.",
                },
              ]}
            />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const idx = weeks.findIndex((w) => w.week_start === week);
  const newer = idx > 0 ? weeks[idx - 1] : null;
  const older = idx >= 0 && idx < weeks.length - 1 ? weeks[idx + 1] : null;
  const stats = numbersCard(digest)?.stats;

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={market.id === "US" ? "us" : "uk"}
        placement="weekly_rail"
      />
      <SeoPageShell
        crumbs={[
          { label: "Weekly", to: "/weekly" },
          {
            label: digest
              ? weekLabel(digest.week_start, digest.week_end)
              : "Week",
          },
        ]}
        cta={{
          body: CTA.body,
          gaLabel: `Weekly · ${week ?? ""}`,
          headline: CTA.headline,
          marketId: market.id === "US" ? "us" : "uk",
          screenshotSlot: "analysis",
        }}
        eyebrow="Weekly digest"
        loading={status === "loading"}
        skeleton={
          <>
            <SeoSkeleton rows={4} variant="stat-tiles" />
            <SeoSkeleton rows={6} variant="doc-sections" />
          </>
        }
        standfirst={digest ? weekLeadSentence(digest, market.label) : undefined}
        standfirstSize="lede"
        title={
          digest
            ? `${market.label} insider buying, ${weekLabel(digest.week_start, digest.week_end)}`
            : "Week"
        }
      >
        {digest ? (
          <>
            <WeeklyCards cards={digest.cards} currency={market.currency} />

            {stats ? (
              <p className={`mt-8 max-w-[62ch] ${R.label} leading-[1.6]`}>
                Totals cover disclosed open-market purchases in the{" "}
                {market.label} market for this week only:{" "}
                {money(stats.total_value ?? 0, market.currency)} across{" "}
                {stats.buy_count} filings. Values are as filed. Nothing here is
                advice.
              </p>
            ) : null}

            <SeoSection
              aside="The weeks either side of this one."
              title="Read next"
            >
              <RelatedCards
                cols={2}
                items={[
                  ...(newer
                    ? [
                        {
                          to: weekPath(newer.week_start),
                          title: `The week of ${weekLabel(newer.week_start, newer.week_end)}`,
                          description: `${newer.buy_count} disclosed buys. The week after this one.`,
                        },
                      ]
                    : []),
                  ...(older
                    ? [
                        {
                          to: weekPath(older.week_start),
                          title: `The week of ${weekLabel(older.week_start, older.week_end)}`,
                          description: `${older.buy_count} disclosed buys. The week before this one.`,
                        },
                      ]
                    : []),
                  {
                    to: "/weekly",
                    title: "Every week",
                    description:
                      "The full archive of weekly digests, newest first.",
                  },
                  {
                    to: "/reports",
                    title: "Monthly reports",
                    description:
                      "The longer view, with how earlier picks actually performed.",
                  },
                ]}
              />
            </SeoSection>
          </>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}
