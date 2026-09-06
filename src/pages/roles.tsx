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
import type { Linking } from "@/components/boards/board-model";

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { summarise } from "../../shared/boards.js";
import {
  buyAlpha,
  buyPerson,
  buyValue,
  isEligibleBuy,
} from "../../shared/leaderboard.js";
import { filingPath } from "../../shared/filings.js";
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
import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import {
  cleanCompanyName,
  cleanInsiderName,
  companyPath,
  displayTicker,
} from "@/lib/company";
import { AlphaBadge } from "@/components/boards/filing-row";
import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { useBoardFeed } from "@/components/boards/board-feed";
import { dateLabel } from "@/components/boards/board-model";
import { BENCHMARK } from "@/components/boards/board-prices";
import { StageFigures } from "@/components/boards/stage-figures";
import { StageNotice } from "@/components/boards/stage-notice";
import {
  roleFigures,
  roleVerdict,
  toRoleColumns,
  RolesStage,
} from "@/components/boards/stages/roles-stage";

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
  const bench = BENCHMARK[market.id];

  // One placement pass for the whole page: the stage, the cards, the figures
  // and the gates all read the same object, so the picture and the list under
  // it cannot describe different corpora.
  const model = useMemo(() => {
    const built = toRoleColumns(rows, market.id);

    // The stage places each purchase into every group it matches in one pass;
    // the per-role filter walks the feed once per group. Two routes, one set —
    // and if they ever come apart, the hero is drawing something the cards
    // aren't.
    if (import.meta.env.DEV && rows) {
      for (const c of built.columns) {
        const n = filingsInRole(rows, market.id, c.slug).length;

        if (n !== c.n) {
          throw new Error(
            `Role bucket ${c.slug} drew ${c.n} purchases, filingsInRole found ${n}.`,
          );
        }
      }
    }

    return built;
  }, [rows, market.id]);

  const buckets = model.published;

  const coverage = useMemo(
    () => roleCoverage(rows ?? [], market.id),
    [rows, market.id],
  );

  // Stage and cards highlight the same group, keyed on its slug.
  const [activeId, setActiveId] = useState<string | null>(null);
  const linking: Linking = useMemo(
    () => ({ activeId, setActiveId }),
    [activeId],
  );

  const cta = roleCta();
  const drawn = rows === null || buckets.length > 0;
  const verdict = useMemo(
    () => (rows === null ? null : roleVerdict(model, complete)),
    [rows, model, complete],
  );
  const standfirst = (
    <>
      The same twelve months of {market.label} buying, split by the job the
      buyer filed under. A chief executive and a newly appointed non-executive
      are both insiders, and they are not both saying the same thing when they
      buy.
    </>
  );

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
        }}
        eyebrow="By role"
        hero={
          drawn ? (
            <RolesStage
              benchmark={bench.label}
              header={
                <>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    By role
                  </p>
                  {/* Light, not bold: the columns are the emphasis and the
                      title names them. */}
                  <h1 className="mt-3 max-w-[22ch] text-balance text-[34px] font-normal leading-[1.02] tracking-[-0.03em] text-white sm:text-[46px] lg:text-[54px]">
                    {market.label} insider buying by role
                  </h1>
                  <p className="mt-5 max-w-[58ch] text-[15px] leading-[1.55] tracking-[-0.004em] text-white/65 sm:text-[16px]">
                    {standfirst}
                  </p>
                  {/* The finding, above the fold and on clean ground. It was
                      only ever in the stage's caption strip, and only on the
                      second of two tabs — the answer to the question the title
                      asks, three scrolls and a click away.

                      Two lines are reserved while the window is in flight so
                      the header doesn't grow under the reader when the data
                      lands. When the verdict comes back null there is nothing
                      to say and nothing is said: a slot reading "Not enough
                      data" where the eye expects the finding is worse than an
                      absent line, and the stage's own small print already
                      explains why there are no marks yet. */}
                  {rows === null ? (
                    <div aria-hidden className="mt-4 h-[3rem]" />
                  ) : verdict ? (
                    <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.5] text-white/85">
                      {verdict}
                    </p>
                  ) : null}
                  <StageFigures
                    reserve
                    items={rows === null ? [] : roleFigures(model)}
                  />
                  <StageNotice marketId={market.id} />
                </>
              }
              linking={linking}
              loading={rows === null}
              model={model}
              symbol={market.symbol}
            />
          ) : undefined
        }
        loading={rows === null}
        skeleton={
          <SeoSkeleton
            rows={rolesForMarket(market.id).length}
            variant="sheet-stack"
          />
        }
        standfirst={drawn ? undefined : standfirst}
        title={<>{market.label} insider buying by role</>}
        titleInHero={drawn}
        width="wide"
      >
        {/* Under the stage: the rule and the truncation caveat. The tracking
            line moved into the stage header, under the figures it qualifies —
            below a 600px object at 45% opacity it was invisible. */}
        <div className="mt-4 max-w-[62ch]">
          <a
            className="inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
            href="#methodology"
          >
            Roles are read from the filed job title. How that’s matched ↓
          </a>
          {/* The empty and error states mount no stage, so there is no header
              for the in-stage notice to sit in. The page still has to say how
              far back it holds. */}
          {drawn ? null : (
            <TrackingNotice className="mt-2.5" marketId={market.id} />
          )}
          {!complete && buckets.length > 0 && (
            // The counts stand as floors when the window is short. The
            // pre-render says so; the hydrated page did not until now.
            <p className={`mt-3 ${CAVEAT}`}>
              We couldn’t load the whole period, so these counts may be missing
              older purchases.
            </p>
          )}
        </div>

        {buckets.length === 0 && !complete ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the filings just now. It’s a network problem rather
            than an empty period. Try a refresh in a moment.
          </p>
        ) : buckets.length === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            No role reached {MIN_FILINGS} qualifying purchases in this period.
            The window is the last twelve months and refills as filings arrive,
            so a group reappears here as soon as it crosses that bar.
          </p>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {buckets.map(({ role, filings, summary }) => (
                <Link
                  key={role.slug}
                  className={`block rounded-2xl border p-5 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03] ${R.rule} ${
                    activeId === role.slug
                      ? "bg-black/[0.03] dark:bg-white/[0.05]"
                      : ""
                  }`}
                  to={rolePath(role.slug)}
                  onMouseEnter={() => setActiveId(role.slug)}
                  onMouseLeave={() => setActiveId(null)}
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
            <TrackingNotice className="mt-2.5" marketId={market.id} />
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

            {/* Ranked on what was spent, so the money is the figure and the
                mark rides beside it. The header names both, because a column
                of signed percentages under no heading reads as a return. */}
            <BoardRowHeader
              facts={["Disclosed"]}
              money="Paid"
              perf="Against the market"
              subject="Company and buyer"
            />

            <BoardRowList>
              {shown.map((d, i) => (
                <RoleFilingRow
                  key={d.id ?? i}
                  deal={d}
                  locale={locale}
                  marketId={market.id}
                  position={i + 1}
                  symbol={market.symbol}
                />
              ))}
            </BoardRowList>
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

/** One purchase on a role hub.
 *
 *  The hub ranks on what was spent, so money is the figure the row leads with
 *  and the mark sits beside it. Unlike the performance board, most of these
 *  rows are new enough to have no mark at all, and that case is the one this
 *  row exists to get right: it says "No mark yet" in words. A dash, an "n/a" or
 *  an empty cell all read as a number we are withholding, and the second static
 *  page rule is that an absent figure says so and says when it will exist.
 *
 *  The row links to the purchase, not the issuer — every UK disclosure has a
 *  permanent page and sending the click to the company index throws away what
 *  the reader chose. `/dealings/:id` is a UK pipeline route, so US rows fall
 *  back to the company page rather than a 404 (see functions/dealings/[id].js). */
function RoleFilingRow({
  deal: d,
  locale,
  marketId,
  position,
  symbol,
}: {
  deal: Dealing | UsDealing;
  locale: string;
  marketId: "UK" | "US";
  position: number;
  symbol: string;
}) {
  const ticker = displayTicker(d.ticker ?? "");
  const person = cleanInsiderName(buyPerson(d) ?? "");
  // The FILED title, not the bucket's name: every row on this page shares the
  // bucket, and what varies — "Non-Executive Chair of Audit and Risk" against a
  // bare "Director" — is exactly what the classification rule acted on.
  const role =
    marketId === "US"
      ? ((d as UsDealing).reporter?.officer_title ?? "")
      : ((d as Dealing).director?.role ?? "");
  const alpha = buyAlpha(d);

  return (
    <BoardRow
      badge={<TickerPill ticker={ticker} />}
      facts={[
        {
          label: "Disclosed",
          value: d.disclosed_date
            ? dateLabel(d.disclosed_date, locale)
            : d.trade_date
              ? dateLabel(d.trade_date, locale)
              : "not dated",
        },
      ]}
      logo={<CompanyLogo size={56} ticker={d.ticker ?? ""} />}
      money={money(buyValue(d), symbol)}
      name={cleanCompanyName(d.company ?? "") || ticker}
      perf={
        alpha == null ? (
          <span className="whitespace-nowrap text-[10.5px] leading-[1.35] text-foreground/45">
            No mark yet
          </span>
        ) : (
          <AlphaBadge ratio={alpha} />
        )
      }
      position={position}
      secondary={
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span>{person || "Undisclosed"}</span>
          {role ? (
            <>
              <span aria-hidden className="opacity-40">
                ·
              </span>
              <span>{role}</span>
            </>
          ) : null}
        </span>
      }
      to={
        marketId === "UK" && d.id
          ? filingPath(d.id)
          : companyPath(d.ticker ?? "")
      }
    />
  );
}
