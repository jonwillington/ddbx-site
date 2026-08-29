/** Insider buying by role — /roles and /roles/:slug.
 *
 *  The taxonomy, the classifier and the published methodology all live in
 *  shared/roles.js. Read that file's header before changing anything here: the
 *  UK role field is uncontrolled free text, and three specific things make a
 *  naive match actively wrong — connected-party filings that name someone
 *  else's job, the genuine overlap between chair and non-executive director,
 *  and committee chairs who are not the company chair.
 *
 *  Two consequences visible on these pages:
 *
 *    - THE BUCKETS DO NOT SUM. A non-executive chair is counted under both
 *      Chair and Non-executive director. The index says so rather than
 *      presenting four slices of a pie that would not add up.
 *    - THE MARKETS PUBLISH DIFFERENT BUCKETS. Chair and non-executive director
 *      describe UK board structure; a Form 4 "director" flag is not the same
 *      office, so those two pages exist on ddbx.uk only rather than being
 *      approximated from a different governance model.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";
import type { RoleEntry } from "../../shared/roles";
import type { RelatedCard } from "@/components/seo/related-cards";

import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { summarise } from "../../shared/boards.js";
import { buyValue, isEligibleBuy } from "../../shared/leaderboard.js";
import {
  inRole,
  missingRoleLabel,
  roleBySlug,
  roleCoverage,
  rolePath,
  rolesForMarket,
  METHODOLOGY,
  MIN_FILINGS,
  TOP_FILINGS,
} from "../../shared/roles.js";

import { money, R, useSectorMarket } from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { StatTiles } from "@/components/seo/stat-tiles";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import { roleCta } from "@/components/seo/cta-copy";
import { LogoDevAttribution } from "@/components/company-logo";
import { FilingRow } from "@/components/boards/filing-row";
import { useBoardFeed } from "@/components/boards/board-feed";

const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

function signedPp(ratio: number | null): string {
  if (ratio == null) return "n/a";

  return `${ratio > 0 ? "+" : ""}${(ratio * 100).toFixed(1)}pp`;
}

/** Eligible purchases in a bucket, largest first. */
function filingsInRole(
  rows: Array<Dealing | UsDealing>,
  market: "UK" | "US",
  slug: string,
) {
  return rows
    .filter((d) => isEligibleBuy(d, market) && inRole(d, market, slug))
    .sort((a, b) => buyValue(b) - buyValue(a));
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

export function RolesIndexPage() {
  const market = useSectorMarket();
  const { rows, complete } = useBoardFeed(market.id);
  const marketId = market.id === "US" ? "us" : "uk";

  const buckets = useMemo(() => {
    const feed = rows ?? [];

    return rolesForMarket(market.id)
      .map((role: RoleEntry) => {
        const filings = filingsInRole(feed, market.id, role.slug);

        return { role, filings, summary: summarise(filings) };
      })
      .filter((b) => b.filings.length >= MIN_FILINGS);
  }, [rows, market.id]);

  const coverage = useMemo(
    () => roleCoverage(rows ?? [], market.id),
    [rows, market.id],
  );

  const cta = roleCta();

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="roles_index_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        cta={{
          body: cta.body,
          gaLabel: "Roles index",
          headline: cta.headline,
          marketId,
          screenshotSlot: "today",
        }}
        eyebrow="By role"
        loading={rows === null}
        notice={
          <>
            <a
              className="inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
              href="#methodology"
            >
              Roles are read from the filed job title. How that’s matched ↓
            </a>
            <TrackingNotice className="mt-2.5" />
          </>
        }
        skeleton={<SeoSkeleton rows={4} variant="stat-tiles" />}
        standfirst={
          <>
            The same twelve months of {market.label} buying, split by the job
            the buyer filed under. A chief executive and a newly appointed
            non-executive are both insiders, and they are not both saying the
            same thing when they buy.
          </>
        }
        title={<>{market.label} insider buying by role</>}
      >
        {buckets.length === 0 && !complete ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the filings just now. It’s a network problem rather
            than an empty period. Try a refresh in a moment.
          </p>
        ) : buckets.length === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            No role reached {MIN_FILINGS} qualifying purchases in this period.
          </p>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {buckets.map(({ role, filings, summary }) => (
                <Link
                  key={role.slug}
                  className={`block rounded-2xl border p-5 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03] ${R.rule}`}
                  to={rolePath(role.slug)}
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-[18px] font-semibold leading-[1.25] tracking-[-0.014em] text-foreground">
                      {role.plural}
                    </span>
                    <span className="text-[13px] tabular-nums text-foreground/55">
                      {filings.length} purchases ·{" "}
                      {money(summary.value, market.symbol)} ·{" "}
                      {summary.companies}{" "}
                      {summary.companies === 1 ? "company" : "companies"}
                    </span>
                  </span>
                  <span className={`mt-2 block max-w-[70ch] ${R.body}`}>
                    {role.blurb}
                  </span>
                </Link>
              ))}
            </div>

            {/* The buckets do not sum, and a reader comparing the numbers above
                against the market total will notice. Better to say why than to
                let it read as an error. */}
            <p className={`mt-5 ${CAVEAT}`}>
              These groups overlap and are not meant to add up. A non-executive
              chair is counted under both Chair and Non-executive director. Of
              the {coverage.total} disclosures in the window,{" "}
              {coverage.classified} fall into at least one group,{" "}
              {coverage.unbucketed} carry a job title we don’t publish a page
              for, and {coverage.closelyAssociated} were filed by someone
              closely associated with an insider rather than by the insider
              {/* Dropped entirely at zero rather than printed as "0 were filed
                  without a job title". The figure is genuinely zero on the UK
                  feed today, so it isn't a number we don't have — it's just a
                  clause that reads as an oversight when it fires. */}
              {coverage.missing > 0
                ? `, and ${coverage.missing} were ${missingRoleLabel(market.id)}`
                : ""}
              .
            </p>
          </>
        )}

        <SeoSection
          aside={
            <p className="text-[12px] leading-[1.5] text-foreground/45">
              These rules decide who lands in which group, and they live in the
              same module that classifies the filings.
            </p>
          }
          id="methodology"
          title="How roles are matched"
          variant="rail"
        >
          <ul className="space-y-2.5">
            {METHODOLOGY.map((line: string) => (
              <li key={line} className={`flex gap-2.5 ${R.body}`}>
                <span
                  aria-hidden
                  className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-foreground/30"
                />
                <span className="max-w-[62ch]">{line}</span>
              </li>
            ))}
          </ul>
        </SeoSection>

        <nav aria-label="More from ddbx" className="mt-9">
          <RelatedCards cols={2} items={INDEX_LINKS} />
        </nav>
      </SeoPageShell>
    </DefaultLayout>
  );
}

const INDEX_LINKS: RelatedCard[] = [
  {
    to: "/biggest-buys",
    title: "The biggest buys",
    description: "Ranked by what was spent",
  },
  {
    to: "/cluster-buys",
    title: "Cluster buying",
    description: "Where several bought at once",
  },
  { to: "/sectors", title: "Buying by sector", description: "Where it went" },
  { to: "/learn", title: "Glossary", description: "The filings explained" },
];

// ---------------------------------------------------------------------------
// One role
// ---------------------------------------------------------------------------

export default function RolePage() {
  const { slug } = useParams<{ slug: string }>();
  const market = useSectorMarket();
  const { rows, complete } = useBoardFeed(market.id);
  const marketId = market.id === "US" ? "us" : "uk";
  const locale = market.id === "US" ? "en-US" : "en-GB";

  const role = roleBySlug(slug ?? "");
  // A bucket that exists but isn't published on this market — /roles/chair on
  // ddbx.us. Treated as not found rather than rendered empty: the concept
  // genuinely doesn't apply here, and an empty page would imply no chairs buy.
  const available = Boolean(role && role.markets.includes(market.id));

  const filings = useMemo(
    () =>
      available && role ? filingsInRole(rows ?? [], market.id, role.slug) : [],
    [rows, market.id, role, available],
  );

  const shown = filings.slice(0, TOP_FILINGS);
  const summary = useMemo(() => summarise(filings), [filings]);
  const topValue = shown.length > 0 ? buyValue(shown[0]) : 0;

  const siblings: RelatedCard[] = rolesForMarket(market.id)
    .filter((r: RoleEntry) => r.slug !== role?.slug)
    .map((r: RoleEntry) => ({
      to: rolePath(r.slug),
      title: r.plural,
      description: r.blurb.split(".")[0] + ".",
    }));

  if (!available) {
    return (
      <DefaultLayout drawerRight>
        <SeoRail
          marketId={marketId}
          placement="roles_rail"
          ukHeading="Start investing"
        />
        <SeoPageShell
          crumbs={[{ label: "By role", to: "/roles" }, { label: "Not found" }]}
          cta={false}
          eyebrow="By role"
          standfirst={
            <>
              {role
                ? `We publish that group for the UK only, a Form 4 officer title has no equivalent of it.`
                : `We don’t publish a page for that role.`}{" "}
              Here are the ones we do publish for {market.label}.
            </>
          }
          title="That isn’t a role we have a page for"
        >
          <SeoSection title="Roles we publish">
            <RelatedCards cols={3} items={siblings} />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const entry = role as RoleEntry;
  const cta = roleCta(entry.plural);

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="roles_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        crumbs={[{ label: "By role", to: "/roles" }, { label: entry.label }]}
        cta={{
          body: cta.body,
          gaLabel: `Role · ${entry.label}`,
          headline: cta.headline,
          marketId,
          screenshotSlot: "analysis",
        }}
        eyebrow="By role"
        loading={rows === null}
        notice={
          <>
            <a
              className="inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
              href="#methodology"
            >
              Who counts as {entry.noun.replace(/s$/, "")} here ↓
            </a>
            <TrackingNotice className="mt-2.5" />
            {!complete && shown.length > 0 && (
              <p className={`mt-3 ${CAVEAT}`}>
                We couldn’t load the whole period, so this may be missing older
                purchases.
              </p>
            )}
          </>
        }
        skeleton={
          <>
            <SeoSkeleton rows={4} variant="stat-tiles" />
            <SeoSkeleton rows={TOP_FILINGS} variant="ranked-board" />
          </>
        }
        standfirst={entry.blurb}
        title={
          <>
            {entry.plural} buying their own shares ({market.label})
          </>
        }
      >
        {shown.length === 0 && !complete ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the filings just now. It’s a network problem rather
            than an empty period. Try a refresh in a moment.
          </p>
        ) : shown.length === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            No qualifying purchases by {entry.noun} in this period.
          </p>
        ) : (
          <>
            <StatTiles
              className="mt-6"
              cols={4}
              note={`Covers the ${filings.length} qualifying purchases by ${entry.noun} in the last twelve months; the ${shown.length} largest are listed. ${summary.alphaCount} of them have a performance mark, and the median is taken from those.`}
              stats={[
                { label: "Purchases", value: filings.length },
                {
                  label: "Combined value",
                  primary: true,
                  value: money(summary.value, market.symbol),
                },
                { label: "Companies", value: summary.companies },
                {
                  label: "Median alpha",
                  tone:
                    summary.medianAlpha == null
                      ? undefined
                      : summary.medianAlpha > 0
                        ? "positive"
                        : summary.medianAlpha < 0
                          ? "negative"
                          : undefined,
                  value: signedPp(summary.medianAlpha),
                },
              ]}
            />

            {/* The bucket's own rule, on the page that applies it. A role hub
                that doesn't state which filed titles it accepts is asserting a
                classification it hasn't shown. */}
            <p className={`mt-6 max-w-[68ch] ${R.body}`}>{entry.definition}</p>

            <div
              aria-hidden
              className="mt-8 grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] gap-x-3 pb-2.5 text-[11px] leading-[1.4] text-foreground/50 sm:grid-cols-[2rem_minmax(0,1fr)_9rem] sm:gap-x-4"
            >
              <span />
              <span>Company, buyer and what they spent</span>
              <span className="text-right">Alpha since disclosure</span>
            </div>

            <ol className={`border-t ${R.rule}`}>
              {shown.map((d, i) => (
                <FilingRow
                  key={d.id ?? i}
                  showRole
                  deal={d}
                  locale={locale}
                  marketId={market.id}
                  meterMax={topValue}
                  meterValue={buyValue(d)}
                  position={i + 1}
                  symbol={market.symbol}
                />
              ))}
            </ol>
          </>
        )}

        <SeoSection
          aside={
            <p className="text-[12px] leading-[1.5] text-foreground/45">
              These rules decide who lands in this group, and they live in the
              same module that classifies the filings.
            </p>
          }
          id="methodology"
          title="How this group is matched"
          variant="rail"
        >
          <ul className="space-y-2.5">
            {METHODOLOGY.map((line: string) => (
              <li key={line} className={`flex gap-2.5 ${R.body}`}>
                <span
                  aria-hidden
                  className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-foreground/30"
                />
                <span className="max-w-[62ch]">{line}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 max-w-[62ch] text-[13px] leading-[1.6] text-foreground/60">
            More on the terms used here:{" "}
            <Link className="underline underline-offset-4" to="/learn/pdmr">
              PDMR
            </Link>
            ,{" "}
            <Link
              className="underline underline-offset-4"
              to="/learn/open-market-buy"
            >
              open-market buys
            </Link>
            , and{" "}
            <Link className="underline underline-offset-4" to="/learn">
              the rest of the glossary
            </Link>
            .
          </p>
        </SeoSection>

        {siblings.length > 0 && (
          <SeoSection
            aside="The same window, split a different way."
            title="Other roles"
          >
            <RelatedCards cols={3} items={siblings} />
          </SeoSection>
        )}

        <LogoDevAttribution className="mt-10" />
      </SeoPageShell>
    </DefaultLayout>
  );
}
