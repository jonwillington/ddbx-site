/** The Insider Index — /insider-index — and one day's reading —
 *  /insider-index/:date.
 *
 *  Both exports live here because they are the same document at two scopes,
 *  as weekly.tsx does for the digest. The undated page states the latest
 *  reading; the dated page states one day's and links to the days either
 *  side. Everything they compute comes from shared/insider-index.js, which the
 *  crawler pre-renders and the daily edition also call, so the tab, the
 *  crawler and the edition cannot print three different numbers for one day.
 *
 *  UK only. The module header explains why: the feeds carry no sells, so the
 *  index is buying against its own record rather than net buying, and the US
 *  feed the site can reach is a curated subset. The page resolves to the UK
 *  market whichever host serves it and canonicalises to ddbx.uk, as the
 *  broker guides do.
 *
 *  One view, deliberately (Jon's static-page principle: a second view has to
 *  say something new). The line is the index; the three components under it
 *  are the same window in figures. There is no second chart of the raw daily
 *  counts because the tooltip states them for any day.
 */
import type { Reading } from "../../shared/insider-index";
import type { RelatedCard } from "@/components/seo/related-cards";
import type { StatTile } from "@/components/seo/stat-tiles";

import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import {
  dateLabel,
  dayMonthLabel,
  feedGap,
  FEED_GAP_LIMIT,
  indexPath,
  INDEX_METHODOLOGY,
  isIndexSlug,
  latestReading,
  MIN_HISTORY,
  publishable,
  publishFrom,
  readingSentence,
  series,
  TIERS,
  todayLondon,
  VALUE_CAP,
  weekChange,
  WINDOW_DAYS,
  windowSentence,
} from "../../shared/insider-index.js";
import { formatMoney } from "../../shared/sectors.js";

import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { StatTiles } from "@/components/seo/stat-tiles";
import { RelatedCards } from "@/components/seo/related-cards";
import { insiderIndexCta } from "@/components/seo/cta-copy";
import { BackLink } from "@/components/back-link";
import { RowList, Row } from "@/components/row-list";
import { useBoardFeed } from "@/components/boards/board-feed";
import { StageNotice } from "@/components/boards/stage-notice";
import { IndexStage } from "@/components/insider-index/index-stage";

const MARKET = {
  id: "UK" as const,
  label: "UK",
  noun: "directors",
  symbol: "£",
};

const R = {
  body: "text-[14px] leading-[1.65] text-foreground/70",
  label: "text-[12px] text-foreground/45",
  rule: "border-hairline dark:border-separator",
};

const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

const LINK =
  "underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground/70";

const CROSS_LINKS: RelatedCard[] = [
  {
    to: "/weekly",
    title: "Week by week",
    description: "What the buying was, each week",
  },
  {
    to: "/cluster-buys",
    title: "Cluster buying",
    description: "Where several insiders bought at once",
  },
  {
    to: "/most-active-companies",
    title: "Most-active companies",
    description: "Where buying repeats",
  },
  {
    to: "/learn/what-a-director-buy-signals",
    title: "What a director buy signals",
    description: "The concept, explained",
  },
];

/** How many recent readings the undated page lists as links. */
const RECENT = 15;

/** The tier rows' one-line meaning each. Written here rather than in the
 *  module because they are page prose, not the formula. */
const TIER_MEANING: Record<string, string> = {
  "very-quiet":
    "Fewer purchases, from fewer companies, than in four out of five windows on record. Closed periods before results season and the summer both look like this.",
  quiet:
    "Below the middle of the record on most of the three measures. Not unusual; a few quiet weeks in a row is.",
  normal:
    "Around the middle of the record. Directors are buying at about the rate they usually do.",
  busy: "More purchases, and more companies bought, than in most windows on record. Often the weeks after a results season, when closed periods lift together.",
  "very-busy":
    "More buying than in four out of five windows on record. Historically the pattern that follows a broad sell-off, when many boards buy at once.",
};

/* ─── Shared document ───────────────────────────────────────────────────── */

function IndexDocument({ date }: { date: string | null }) {
  const { rows, complete } = useBoardFeed(MARKET.id);
  const today = todayLondon();

  const all = useMemo(() => (rows ? series(rows, MARKET.id) : null), [rows]);
  const published = useMemo(() => publishable(all), [all]);
  const focus: Reading | null = useMemo(() => {
    if (!all) return null;
    if (date) return published.find((r) => r.date === date) ?? null;

    return latestReading(all);
  }, [all, published, date]);
  const focusIdx = focus && all ? all.indexOf(focus) : -1;
  const sentence = all && focusIdx >= 0 ? readingSentence(all, focusIdx) : null;
  const change = all && focusIdx >= 0 ? weekChange(all, focusIdx) : null;
  const gap = rows ? feedGap(rows, today, MARKET.id) : 0;
  const notYet = all ? publishFrom(all) : null;

  const loading = rows === null;
  const failed = !loading && !complete && (rows?.length ?? 0) === 0;
  // A dated page whose date has no reading: before the index published,
  // a future date, or a weekend that slipped past the slug check.
  const missing = !loading && !failed && !!date && !focus;

  const pubIdx = focus ? published.indexOf(focus) : -1;
  const older = pubIdx > 0 ? published[pubIdx - 1] : null;
  const newer =
    pubIdx >= 0 && pubIdx < published.length - 1 ? published[pubIdx + 1] : null;
  const latest = latestReading(all);
  const isLatest = !!focus && !!latest && focus.date === latest.date;

  const title = date
    ? `The UK Insider Index on ${dateLabel(date)}`
    : "The UK Insider Index";

  const standfirst = (
    <>
      One number for how much UK directors are buying, updated every trading
      day: the last {WINDOW_DAYS} trading days of open-market purchases, ranked
      against every earlier window on record. 50 is normal, 100 is the busiest
      it has been, 0 the quietest.
    </>
  );

  const figures: StatTile[] =
    focus &&
    focus.countPct != null &&
    focus.breadthPct != null &&
    focus.valuePct != null
      ? [
          {
            label: "Purchases",
            value: <Figure pct={focus.countPct} value={String(focus.count)} />,
            primary: true,
          },
          {
            label: "Companies bought",
            value: (
              <Figure pct={focus.breadthPct} value={String(focus.breadth)} />
            ),
          },
          {
            label: "Spent, capped",
            value: (
              <Figure
                pct={focus.valuePct}
                value={formatMoney(focus.value, MARKET.symbol)}
              />
            ),
          },
        ]
      : [];

  const caption = focus ? (
    <>
      <span>
        {windowSentence(focus, MARKET.id)}
        {change != null ? (
          <>
            {" "}
            {change === 0
              ? "Unchanged on the week."
              : `${change > 0 ? "Up" : "Down"} ${Math.abs(change)} on the week.`}
          </>
        ) : null}
      </span>
      <span className="text-white/45">
        {published.length} readings since{" "}
        {dayMonthLabel(published[0]?.date ?? "")}
      </span>
    </>
  ) : notYet ? (
    <span>
      Not enough readings yet. The index needs {MIN_HISTORY} trading days to
      rank against and will first publish on {dateLabel(notYet)}.
    </span>
  ) : null;

  const shellCta = {
    body: insiderIndexCta.body,
    gaLabel: date ? `Insider index · ${date}` : "Insider index",
    headline: insiderIndexCta.headline,
    marketId: "uk" as const,
  };

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId="uk" placement="insider_index_rail" />
      <SeoPageShell
        back={date ? <BackLink /> : undefined}
        crumbs={
          date
            ? [
                { label: "Insider Index", to: indexPath() },
                { label: isIndexSlug(date) ? dateLabel(date) : "Not found" },
              ]
            : undefined
        }
        cta={missing || failed ? false : shellCta}
        eyebrow="Insider Index"
        hero={
          missing || failed ? undefined : (
            <IndexStage
              all={all}
              caption={caption}
              focusDate={focus?.date ?? null}
              header={
                <>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Insider Index
                  </p>
                  <h1 className="mt-3 max-w-[22ch] text-balance text-[34px] font-normal leading-[1.02] tracking-[-0.03em] text-white sm:text-[44px] lg:text-[50px]">
                    {title}
                  </h1>
                  <p className="mt-5 max-w-[52ch] text-[15px] leading-[1.55] tracking-[-0.004em] text-white/65 sm:text-[16px]">
                    {sentence ?? standfirst}
                  </p>
                  <StageNotice marketId="uk" />
                </>
              }
              symbol={MARKET.symbol}
            />
          )
        }
        loading={loading}
        skeleton={
          <>
            <SeoSkeleton rows={3} variant="stat-tiles" />
            <SeoSkeleton rows={5} variant="doc-sections" />
          </>
        }
        standfirst={missing || failed ? undefined : standfirst}
        title={
          missing
            ? "No reading for that day"
            : failed
              ? "Couldn’t load the index"
              : title
        }
        titleInHero={!missing && !failed}
        width="wide"
      >
        {failed ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the filings the index is computed from. That’s a
            fault at our end rather than a quiet market. Try a refresh in a
            moment.
          </p>
        ) : missing ? (
          <>
            <p className={`mt-10 max-w-[62ch] ${R.body}`}>
              The index publishes one reading per trading day, from{" "}
              {published[0]
                ? dateLabel(published[0].date)
                : "the first day it has enough history"}{" "}
              to {latest ? dateLabel(latest.date) : "today"}. That date is
              outside the record, a weekend, or not yet reached.
            </p>
            <SeoSection aside="Where to go from here." title="The index">
              <RelatedCards
                cols={2}
                items={[
                  {
                    to: indexPath(),
                    title: "Today’s reading",
                    description: "The latest reading and the whole line.",
                  },
                  ...(latest
                    ? [
                        {
                          to: indexPath(latest.date),
                          title: dateLabel(latest.date),
                          description: "The most recent published reading.",
                        },
                      ]
                    : []),
                ]}
              />
            </SeoSection>
          </>
        ) : (
          <>
            {/* Under the stage: the rule and the caveats. */}
            <div className="mt-4 max-w-[62ch]">
              <a
                className="inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
                href="#methodology"
              >
                Buying against its own record, not net of selling. How it is
                calculated ↓
              </a>
              {!complete && (
                <p className={`mt-3 ${CAVEAT}`}>
                  We couldn’t load the whole record, so readings may be ranked
                  against fewer earlier windows than they should be.
                </p>
              )}
              {gap >= FEED_GAP_LIMIT && (
                <p className={`mt-3 ${CAVEAT}`}>
                  No disclosure has reached the record for {gap} trading days.
                  That is more likely a pause in the feed than a market with
                  nothing in it, so treat the latest readings as provisional
                  until it resumes.
                </p>
              )}
              {focus && !isLatest && latest ? (
                <p className={`mt-3 ${R.label}`}>
                  This is the reading for {dateLabel(focus.date)}. The latest is{" "}
                  <Link className={LINK} to={indexPath()}>
                    {latest.score} on {dateLabel(latest.date)}
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            {/* 01: the window in figures. */}
            <SeoSection
              aside={
                focus
                  ? `The three measures behind the reading of ${focus.score}, each with its rank against every earlier ${WINDOW_DAYS}-day window on record.`
                  : "The three measures behind every reading."
              }
              index={1}
              title={
                focus
                  ? `What the ${dayMonthLabel(focus.date)} reading is made of`
                  : "What a reading is made of"
              }
              total={4}
            >
              {figures.length > 0 ? (
                <StatTiles
                  cols={3}
                  note={`Spent is the sum of purchases with each first capped at ${formatMoney(VALUE_CAP.UK, MARKET.symbol)}, so one large cheque cannot move the index on its own. Window: ${focus ? `${dateLabel(focus.windowStart)} to ${dateLabel(focus.date)}` : `${WINDOW_DAYS} trading days`}.`}
                  stats={figures}
                />
              ) : (
                <p className={`max-w-[62ch] ${R.body}`}>
                  Not enough data yet.{" "}
                  {notYet
                    ? `The first reading will be published on ${dateLabel(notYet)}, once ${MIN_HISTORY} earlier windows exist to rank it against.`
                    : "The index needs eight weeks of readings before it can rank a window."}
                </p>
              )}
            </SeoSection>

            {/* 02: the tiers, as selling rows. */}
            <SeoSection
              aside="Five tiers, a fifth of the scale each. Because every reading is a rank, about a fifth of days land in each."
              index={2}
              title="How to read it"
              total={4}
            >
              <RowList ordered={false}>
                {[...TIERS].reverse().map((t) => (
                  <Row
                    key={t.id}
                    glyph={
                      <span
                        aria-hidden
                        className={`mt-1.5 block h-2.5 w-2.5 rounded-full ${
                          focus?.tier?.id === t.id
                            ? "bg-brand-brown dark:bg-brand-tan"
                            : "bg-foreground/20"
                        }`}
                      />
                    }
                    kicker={`${t.min} to ${t.min + 19}${
                      t.id === "very-busy" ? " and 100" : ""
                    }${focus?.tier?.id === t.id ? " · today" : ""}`}
                    title={t.label}
                  >
                    {TIER_MEANING[t.id]}
                  </Row>
                ))}
              </RowList>
            </SeoSection>

            {/* 03: the record, as links. */}
            <SeoSection
              aside={
                date
                  ? "The trading days either side of this one."
                  : "One reading per trading day, newest first. Every day has its own page."
              }
              index={3}
              title={date ? "Days either side" : "Recent readings"}
              total={4}
            >
              {date ? (
                <RelatedCards
                  cols={2}
                  items={[
                    ...(newer
                      ? [
                          {
                            to: indexPath(newer.date),
                            title: `${dateLabel(newer.date)}: ${newer.score}, ${newer.tier?.phrase}`,
                            description: "The trading day after this one.",
                          },
                        ]
                      : []),
                    ...(older
                      ? [
                          {
                            to: indexPath(older.date),
                            title: `${dateLabel(older.date)}: ${older.score}, ${older.tier?.phrase}`,
                            description: "The trading day before this one.",
                          },
                        ]
                      : []),
                    {
                      to: indexPath(),
                      title: "Today’s reading",
                      description: "The latest reading and the whole line.",
                    },
                  ]}
                />
              ) : published.length > 0 ? (
                <ReadingList rows={[...published].reverse().slice(0, RECENT)} />
              ) : (
                <p className={`max-w-[62ch] ${R.body}`}>
                  No readings published yet.
                </p>
              )}
            </SeoSection>

            {/* 04: the formula. */}
            <SeoSection
              aside={
                <p className="text-[12px] leading-[1.5] text-foreground/45">
                  These rules decide every reading, and they live in the same
                  module that draws the line above.
                </p>
              }
              id="methodology"
              index={4}
              title="How it is calculated"
              total={4}
              variant="rail"
            >
              <Formula />
              <ul className="mt-6 space-y-2.5">
                {INDEX_METHODOLOGY.map((line) => (
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

            {/* What this is, and where to go. Outside the numbered run. */}
            <SeoSection
              aside="Why a count of directors buying is worth a number of its own."
              title="What this is"
            >
              <div className={`max-w-[62ch] space-y-3 ${R.body}`}>
                <p>
                  When a director buys shares in their own company on the open
                  market, they have to say so within two working days, and it is
                  published as an RNS. ddbx records every one of those
                  disclosures for UK-listed companies and rates the ones that
                  matter. The index is that record, counted.
                </p>
                <p>
                  Directors as a group tend to buy more when they think their
                  shares are cheap, and closed periods before results stop them
                  buying at all. So the line rises after sell-offs and falls
                  into results seasons, which is what makes it worth watching as
                  a barometer rather than as a tip. A high reading says many
                  boards are putting money in; it does not say they are right.
                </p>
                <p>
                  More on the terms used here:{" "}
                  <Link className={LINK} to="/learn/open-market-buy">
                    open-market buys
                  </Link>
                  ,{" "}
                  <Link className={LINK} to="/learn/closed-period">
                    closed periods
                  </Link>
                  ,{" "}
                  <Link className={LINK} to="/learn/pdmr">
                    who counts as an insider
                  </Link>
                  , and{" "}
                  <Link className={LINK} to="/how-it-works">
                    how each purchase is rated
                  </Link>
                  .
                </p>
              </div>
            </SeoSection>

            <nav aria-label="More from ddbx" className="mt-9">
              <RelatedCards cols={2} items={CROSS_LINKS} />
            </nav>
          </>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** A figure with its rank beside it: "118" over "higher than 74%". The rank
 *  is the load-bearing part, so it is stated, not implied by a bar. */
function Figure({ value, pct }: { value: string; pct: number }) {
  const p = Math.round(pct);

  return (
    <>
      {value}
      <span className="mt-1.5 block text-[12px] font-normal leading-[1.4] tracking-normal text-foreground/50">
        {p >= 50 ? `above ${p}% of windows` : `above only ${p}% of windows`}
      </span>
    </>
  );
}

/** The formula, stated once, as the page's own statement rather than as a
 *  comment in code. */
function Formula() {
  return (
    <div className="rounded-2xl border border-hairline bg-sheet px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] text-foreground/80 dark:border-white/[0.07] dark:bg-surface">
      <p>window(d) = the {WINDOW_DAYS} trading days ending on d, inclusive</p>
      <p>count(d) = open-market purchases disclosed in window(d)</p>
      <p>breadth(d) = distinct companies bought in window(d)</p>
      <p>
        value(d) = Σ min(purchase, {formatMoney(VALUE_CAP.UK, "£")}) over
        window(d)
      </p>
      <p>
        rank(x, d) = share of earlier windows (up to 250) that x(d) exceeds,
        ties half
      </p>
      <p className="text-foreground">
        index(d) = round( (rank(count) + rank(breadth) + rank(value)) / 3 )
      </p>
      <p className="text-foreground/55">
        published once {MIN_HISTORY} earlier windows exist; 0 to 100; 50 is the
        middle of the record
      </p>
    </div>
  );
}

/** Recent readings as a ruled list. Subject (the date) heaviest, the figure
 *  semibold and tabular, the tier as caption. Every row is a link. */
function ReadingList({ rows }: { rows: Reading[] }) {
  return (
    <ul className={`border-t ${R.rule}`}>
      {rows.map((r) => (
        <li key={r.date} className={`border-b ${R.rule}`}>
          <Link
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 py-3 transition-colors hover:bg-foreground/[0.02] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            to={indexPath(r.date)}
          >
            <span className="text-[14.5px] font-medium text-foreground">
              {dateLabel(r.date)}
            </span>
            <span className={`hidden sm:block ${R.label}`}>
              {r.count} purchases · {r.breadth} companies
            </span>
            <span className="text-right">
              <span className="text-[15px] font-semibold tabular-nums text-foreground">
                {r.score}
              </span>
              <span className={`ml-2 ${R.label}`}>{r.tier?.label}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ─── /insider-index ────────────────────────────────────────────────────── */

export default function InsiderIndexPage() {
  return <IndexDocument date={null} />;
}

/* ─── /insider-index/:date ──────────────────────────────────────────────── */

export function InsiderIndexDatePage() {
  const { date } = useParams<{ date: string }>();
  // A slug that is not a trading day is a not-found, not a redirect to the
  // nearest Friday: the URL names a day and the page must show that day.
  const slug = date && isIndexSlug(date) ? date : "invalid";

  return <IndexDocument date={slug} />;
}
