/** Daily editions: the archive at /daily, one trading day at /daily/:date,
 *  and the /today redirect. US at /us/daily, /us/daily/:date and /us/today.
 *
 *  All three exports live here because they are the same document at three
 *  scopes and share every helper, as weekly.tsx does for the digest.
 *
 *  Everything the page states comes from shared/days.js: the calendar, the
 *  URL shape, the model and every sentence. The pre-render Functions read the
 *  same module, so a crawler and a reader get the same day. The only prose
 *  this file contributes is the section furniture and the standing copy at
 *  the foot (what an edition is, the terms on it).
 *
 *  The market is decided by the ROUTE, never the host: /daily is UK and
 *  /us/daily is US on every domain, exactly as the filing pages do it. The
 *  header of shared/days.js has the argument.
 */
import type {
  AnyRow,
  ArchiveDay,
  DayStatus,
  EditionFetch,
  EditionModel,
} from "../../shared/days";
import type { DailySummary } from "@/types/ddbx";
import type { RelatedCard } from "@/components/seo/related-cards";
import type { InsiderIndexSlot as IndexSlot } from "@/lib/insider-index-slot";

import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import {
  DAILY_MARKETS,
  archiveLeadSentence,
  citedFilings,
  closedSentence,
  clusterBuyers,
  overviewNarrative,
  dailyIndexPath,
  dailyMarket,
  dailyPath,
  dateLabel,
  dayLabel,
  dayMoney,
  dayShort,
  dayStatus,
  editionLeadSentence,
  fetchArchive,
  fetchEdition,
  filingHref,
  insiderOf,
  isDateSlug,
  isHolderOnly,
  latestEditionDate,
  monthHeading,
  nearestEditionDate,
  nextTradingDay,
  prevTradingDay,
  summaryBody,
  verdictLine,
  verdictWord,
} from "../../shared/days.js";

import DefaultLayout from "@/layouts/default";
import { API_BASE } from "@/lib/api";
import { BackLink } from "@/components/back-link";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { StatTiles } from "@/components/seo/stat-tiles";
import { RelatedCards } from "@/components/seo/related-cards";
import { dailyCta } from "@/components/seo/cta-copy";
import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import {
  cleanCompanyName,
  cleanInsiderName,
  displayTicker,
} from "@/lib/company";
import { insiderIndexSlot } from "@/lib/insider-index-slot";

type MarketId = "UK" | "US";

/** The row's consideration in the market's canonical field: `value_gbp` on a
 *  UK row, `value` (dollars) on a US one. */
const rowValue = (d: AnyRow) =>
  Number(
    (d as { value_gbp?: number }).value_gbp ??
      (d as { value?: number }).value ??
      0,
  );

const R = {
  body: "text-body text-foreground/70",
  label: "text-small text-foreground/45",
  rule: "border-rule",
  link: "text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan",
};

/* ─── /today ─────────────────────────────────────────────────────────────── */

/** The client-side half of /today. The edge Function 302s before React ever
 *  mounts on a cold load; this covers a client-side navigation, which the
 *  Function cannot see. Same target, computed the same way. */
export function TodayRedirect({ market }: { market: MarketId }) {
  const date = latestEditionDate(market) ?? DAILY_MARKETS[market].since;

  return <Navigate replace to={dailyPath(market, date)} />;
}

/* ─── /daily ─────────────────────────────────────────────────────────────── */

export function DailyIndexPage({ market }: { market: MarketId }) {
  const m = dailyMarket(market);
  const [days, setDays] = useState<ArchiveDay[] | null>(null);
  const [complete, setComplete] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    fetchArchive({ apiBase: API_BASE, market: m.id })
      .then((r) => {
        if (!live) return;
        // An empty walk that did not finish is an outage, not an empty
        // archive (static-page rule 2): say so rather than "none yet".
        setDays(r.days);
        setComplete(r.complete);
        setFailed(r.failed);
      })
      .catch(() => {
        if (!live) return;
        setDays([]);
        setFailed(true);
      });

    return () => {
      live = false;
    };
  }, [m.id]);

  const rows = days ?? [];
  const months = useMemo(() => {
    const out: Array<{ heading: string; days: ArchiveDay[] }> = [];

    for (const d of rows) {
      const heading = monthHeading(d.date);
      const last = out[out.length - 1];

      if (last && last.heading === heading) last.days.push(d);
      else out.push({ heading, days: [d] });
    }

    return out;
  }, [rows]);

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId={m.marketId} placement="daily_rail" />
      <SeoPageShell
        crumbs={[{ label: "Daily editions" }]}
        cta={{
          body: dailyCta.body,
          gaLabel: "Daily index",
          headline: dailyCta.headline,
          marketId: m.marketId,
        }}
        eyebrow="Daily editions"
        loading={days === null}
        skeleton={<SeoSkeleton rows={14} variant="ruled-list" />}
        standfirst={
          rows.length > 0 && complete
            ? archiveLeadSentence(rows, m.id)
            : `Every trading day of disclosed ${m.label} insider buying: what was filed, what it was worth, and which purchases cleared the rating bar.`
        }
        standfirstSize="lede"
        title={`${m.label} insider buying, day by day`}
      >
        {failed ? (
          <p className={`mt-10 max-w-measure ${R.body}`}>
            We couldn’t load the archive just now. That’s a fault at our end
            rather than an empty record. Try again shortly.
          </p>
        ) : rows.length === 0 ? (
          <p className={`mt-10 max-w-measure ${R.body}`}>
            No editions yet for {m.label}. An edition appears here on the first
            trading day a purchase is disclosed; the feed is read every fifteen
            minutes through the session.
          </p>
        ) : (
          <>
            <SeoSection
              aside={
                complete
                  ? "Newest first. A trading day with nothing filed has no entry; a weekend or a holiday never does."
                  : "Newest first. We couldn’t load the whole record, so the oldest days may be missing from this list."
              }
              title="Every trading day"
            >
              {months.map((group) => (
                <div key={group.heading} className="mt-6 first:mt-2">
                  <p className="eyebrow text-foreground/45">{group.heading}</p>
                  <ul className={`mt-2 border-t ${R.rule}`}>
                    {group.days.map((d) => (
                      <li key={d.date} className={`border-b ${R.rule}`}>
                        <Link
                          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5 transition-colors hover:bg-foreground/[0.02]"
                          to={dailyPath(m.id, d.date)}
                        >
                          <span className="text-body font-medium text-foreground">
                            {dayLabel(d.date)}
                          </span>
                          <span className={`tabular-nums ${R.label}`}>
                            {d.count} {d.count === 1 ? "filing" : "filings"}
                            {" · "}
                            {dayMoney(d.value, m.currency)}
                            {d.rated > 0
                              ? ` · ${d.rated} rated`
                              : " · none rated"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </SeoSection>

            <WhatThisIs market={m.id} />

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards
                cols={2}
                items={[
                  {
                    to: "/weekly",
                    title: "Week by week",
                    description:
                      "The same record at a week’s remove: totals, the biggest cheque, the sectors it went into.",
                  },
                  {
                    to: "/reports",
                    title: "Monthly reports",
                    description:
                      "The longer view, with how earlier picks actually performed.",
                  },
                  {
                    to: "/biggest-buys",
                    title: "The biggest buys",
                    description:
                      "The largest purchases insiders have made in their own companies.",
                  },
                  {
                    to: "/cluster-buys",
                    title: "Cluster buying",
                    description:
                      "Where several insiders bought the same company within a fortnight.",
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

/* ─── /daily/:date ───────────────────────────────────────────────────────── */

type PageState =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "signpost"; status: DayStatus }
  | { kind: "failed"; status: DayStatus }
  | { kind: "ok"; status: DayStatus; edition: EditionFetch };

export default function DailyEditionPage({ market }: { market: MarketId }) {
  const { date } = useParams<{ date: string }>();
  const m = dailyMarket(market);
  const valid = !!date && isDateSlug(date);
  const status: DayStatus | null = valid ? dayStatus(date, m.id) : null;
  const hasEdition = status === "past" || status === "today";

  const [state, setState] = useState<PageState>(() =>
    !valid
      ? { kind: "invalid" }
      : hasEdition
        ? { kind: "loading" }
        : { kind: "signpost", status: status! },
  );
  const [indexSlot, setIndexSlot] = useState<IndexSlot | null>(null);

  useEffect(() => {
    if (!valid || !date) {
      setState({ kind: "invalid" });

      return;
    }
    const s = dayStatus(date, m.id);

    if (s !== "past" && s !== "today") {
      setState({ kind: "signpost", status: s });

      return;
    }

    let live = true;

    setState({ kind: "loading" });
    setIndexSlot(null);
    fetchEdition({ apiBase: API_BASE, market: m.id, date })
      .then((edition) => {
        if (!live) return;
        setState(
          edition.status.dealings === "ok"
            ? { kind: "ok", status: s, edition }
            : { kind: "failed", status: s },
        );
      })
      .catch(() => live && setState({ kind: "failed", status: s }));

    // The Insider Index slot. Its absence costs the section, not the page.
    insiderIndexSlot(m.id, date)
      .then((r) => live && setIndexSlot(r))
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [m.id, date, valid]);

  const rail = <SeoRail marketId={m.marketId} placement="daily_rail" />;
  const cta = {
    body: dailyCta.body,
    gaLabel: `Daily · ${m.id} · ${date ?? ""}`,
    headline: dailyCta.headline,
    marketId: m.marketId,
  };

  /* A URL that names no edition: a weekend, a holiday, a future date, a date
     before the record, or not a date at all. Say why, and point at the
     nearest day that has one. Never indexed (the Function noindexes it). */
  if (state.kind === "invalid" || state.kind === "signpost") {
    const nearest =
      valid && date ? nearestEditionDate(date, m.id) : latestEditionDate(m.id);
    const after =
      valid && date && state.kind === "signpost" && state.status === "closed"
        ? boundedNext(date, m.id)
        : null;
    const items: RelatedCard[] = [
      ...(nearest
        ? [
            {
              to: dailyPath(m.id, nearest),
              title: dayLabel(nearest),
              description:
                state.kind === "signpost" && state.status === "future"
                  ? "The latest edition."
                  : state.kind === "signpost" && state.status === "before"
                    ? "The first edition on record."
                    : "The last trading day before it.",
            },
          ]
        : []),
      ...(after && after !== nearest
        ? [
            {
              to: dailyPath(m.id, after),
              title: dayLabel(after),
              description: "The first trading day after it.",
            },
          ]
        : []),
      {
        to: dailyIndexPath(m.id),
        title: "Every trading day",
        description: "The full archive of daily editions, newest first.",
      },
    ];

    return (
      <DefaultLayout drawerRight>
        {rail}
        <SeoPageShell
          back={<BackLink />}
          crumbs={[
            { label: "Daily editions", to: dailyIndexPath(m.id) },
            { label: valid && date ? dateLabel(date) : "Not found" },
          ]}
          cta={cta}
          eyebrow="Daily edition"
          standfirst={
            state.kind === "signpost" && date
              ? closedSentence(date, m.id, state.status)
              : "That isn’t a date we recognise. Editions are addressed by day, as /daily/2026-09-15."
          }
          standfirstSize="lede"
          title={
            state.kind === "signpost" && state.status === "closed"
              ? `The market was closed on ${valid && date ? dateLabel(date) : "that day"}`
              : `No edition for ${valid && date ? dateLabel(date) : "that day"}`
          }
        >
          <SeoSection
            aside="The nearest day that has one."
            title="Read instead"
          >
            <RelatedCards cols={2} items={items} />
          </SeoSection>
          <WhatThisIs market={m.id} />
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const iso = date!;
  const prev = prevTradingDay(iso, m.id);
  const next = boundedNext(iso, m.id);
  const nav = (
    <DayNav market={m.id} next={next} prev={prev} status={status ?? "past"} />
  );

  if (state.kind === "failed") {
    return (
      <DefaultLayout drawerRight>
        {rail}
        <SeoPageShell
          back={<BackLink />}
          crumbs={[
            { label: "Daily editions", to: dailyIndexPath(m.id) },
            { label: dateLabel(iso) },
          ]}
          eyebrow="Daily edition"
          standfirst="We couldn’t load this day just now. That’s a fault at our end rather than a quiet day."
          standfirstSize="lede"
          title={`${m.label} insider buying, ${dayLabel(iso)}`}
        >
          {nav}
          <SeoSection
            aside="The days either side of this one."
            title="Read next"
          >
            <RelatedCards cols={2} items={neighbourCards(m.id, prev, next)} />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const edition = state.kind === "ok" ? state.edition : null;
  const model = edition?.model ?? null;
  const dayState = state.kind === "ok" ? state.status : (status ?? "past");

  return (
    <DefaultLayout drawerRight>
      {rail}
      <SeoPageShell
        back={<BackLink />}
        crumbs={[
          { label: "Daily editions", to: dailyIndexPath(m.id) },
          { label: dateLabel(iso) },
        ]}
        cta={cta}
        eyebrow="Daily edition"
        loading={state.kind === "loading"}
        skeleton={
          <>
            <SeoSkeleton rows={4} variant="stat-tiles" />
            <SeoSkeleton rows={2} variant="doc-sections" />
            <SeoSkeleton
              board={{ facts: 1, logo: 56, meter: false }}
              rows={6}
              variant="ranked-board"
            />
          </>
        }
        standfirst={
          model
            ? editionLeadSentence(model, dayState)
            : `What ${m.label} ${m.noun} disclosed on ${dayLabel(iso)}.`
        }
        standfirstSize="lede"
        title={`${m.label} insider buying, ${dayLabel(iso)}`}
      >
        {model && edition ? (
          <EditionBody
            edition={edition}
            indexSlot={indexSlot}
            market={m.id}
            model={model}
            nav={nav}
            neighbours={neighbourCards(m.id, prev, next)}
            status={dayState}
          />
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** The next trading day, unless it is after the latest edition. */
function boundedNext(iso: string, market: MarketId): string | null {
  const next = nextTradingDay(iso, market);
  const latest = latestEditionDate(market);

  return next && latest && next <= latest ? next : null;
}

function neighbourCards(
  market: MarketId,
  prev: string | null,
  next: string | null,
): RelatedCard[] {
  return [
    ...(next
      ? [
          {
            to: dailyPath(market, next),
            title: dayLabel(next),
            description: "The trading day after this one.",
          },
        ]
      : []),
    ...(prev && prev >= DAILY_MARKETS[market].since
      ? [
          {
            to: dailyPath(market, prev),
            title: dayLabel(prev),
            description: "The trading day before this one.",
          },
        ]
      : []),
    {
      to: dailyIndexPath(market),
      title: "Every trading day",
      description: "The full archive of daily editions, newest first.",
    },
    {
      to: "/weekly",
      title: "Week by week",
      description: "The same record at a week’s remove.",
    },
  ];
}

/* ─── The day's furniture ────────────────────────────────────────────────── */

function DayNav({
  market,
  next,
  prev,
  status,
}: {
  market: MarketId;
  next: string | null;
  prev: string | null;
  status: DayStatus;
}) {
  const showPrev = prev != null && prev >= DAILY_MARKETS[market].since;

  return (
    <nav
      aria-label="Adjacent trading days"
      className={`mt-6 flex items-center justify-between gap-4 border-y ${R.rule} py-2.5 text-small`}
    >
      {showPrev ? (
        <Link
          className="group inline-flex items-center gap-1.5 text-foreground/60 transition-colors hover:text-foreground"
          to={dailyPath(market, prev)}
        >
          <span
            aria-hidden
            className="transition-transform duration-150 group-hover:-translate-x-0.5"
          >
            ←
          </span>
          {dayShort(prev)}
        </Link>
      ) : (
        <span />
      )}
      <span className="eyebrow text-foreground/35">
        {status === "today" ? "Session in progress" : "Session closed"}
      </span>
      {next ? (
        <Link
          className="group inline-flex items-center gap-1.5 text-foreground/60 transition-colors hover:text-foreground"
          to={dailyPath(market, next)}
        >
          {dayShort(next)}
          <span
            aria-hidden
            className="transition-transform duration-150 group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      ) : (
        <Link
          className="inline-flex items-center gap-1.5 text-foreground/60 transition-colors hover:text-foreground"
          to={dailyIndexPath(market)}
        >
          Every day
        </Link>
      )}
    </nav>
  );
}

function EditionBody({
  edition,
  market,
  model,
  nav,
  neighbours,
  indexSlot,
  status,
}: {
  edition: EditionFetch;
  market: MarketId;
  model: EditionModel;
  nav: React.ReactNode;
  neighbours: RelatedCard[];
  indexSlot: IndexSlot | null;
  status: DayStatus;
}) {
  const m = dailyMarket(market);
  const today = status === "today";
  // The numbered run: numbers, the read, [the index], the money, the
  // filings. The index section only counts when it renders, and a day with
  // nothing filed drops the last two rather than saying "nothing" three
  // times over.
  const empty = model.count === 0;
  const citations = citedFilings(model, edition.cited);
  const total = (empty ? 2 : 4) + (indexSlot ? 1 : 0);
  let n = 0;
  const step = () => ++n;

  return (
    <>
      {nav}

      <SeoSection
        aside={
          today
            ? "So far today. The feed is read every fifteen minutes through the session."
            : undefined
        }
        index={step()}
        title="The day in numbers"
        total={total}
      >
        {model.count === 0 ? (
          <p className={`max-w-measure ${R.body}`}>
            {today
              ? m.id === "US"
                ? "Nothing filed yet. Form 4s reach the SEC through the day and into the evening, New York time; the page fills in as they land."
                : "Nothing disclosed yet. Most UK announcements land between 7am and 6pm London time; the page fills in as they file."
              : `No open-market purchases were disclosed by ${m.label} ${m.noun} on this day. That is a fact about the market, not a gap in the record.`}
          </p>
        ) : (
          <StatTiles
            cols={4}
            note={
              model.rated === 0
                ? "None of the day’s purchases cleared the rating bar. That happens on quiet days; it is not a fault."
                : undefined
            }
            stats={[
              { label: "Filings", value: String(model.count), primary: true },
              {
                label: "Total value",
                value: dayMoney(model.value, model.currency),
              },
              {
                label: "Companies",
                value: String(model.companies),
              },
              { label: "Rated", value: String(model.rated) },
            ]}
          />
        )}
      </SeoSection>

      <SeoSection
        aside="The close-of-day summary, written after the market shut."
        index={step()}
        title="The read"
        total={total}
      >
        <TheRead
          cited={citations.rows}
          market={market}
          status={status}
          summary={edition.summary}
          summaryStatus={edition.status.summary}
        />
      </SeoSection>

      {indexSlot ? (
        <SeoSection
          aside="How busy the buying is, against its own record."
          index={step()}
          title="Insider Index"
          total={total}
        >
          <InsiderIndexSlot date={edition.model.date} slot={indexSlot} />
        </SeoSection>
      ) : null}

      {empty ? null : (
        <>
          <SeoSection
            aside="The biggest single purchase, and any company where more than one insider was buying."
            index={step()}
            title="Where the money went"
            total={total}
          >
            <MoneySection market={market} model={model} />
          </SeoSection>

          <SeoSection
            aside="Largest first. Each row is the filing’s own page."
            index={step()}
            title="Every filing"
            total={total}
          >
            <FilingsList cited={citations.ids} market={market} model={model} />
          </SeoSection>
        </>
      )}

      <WhatThisIs market={market} />

      <SeoSection aside="The days either side of this one." title="Read next">
        <RelatedCards cols={2} items={neighbours} />
      </SeoSection>
    </>
  );
}

/* ─── The read ───────────────────────────────────────────────────────────── */

function TheRead({
  cited,
  market,
  status,
  summary,
  summaryStatus,
}: {
  cited: AnyRow[];
  market: MarketId;
  status: DayStatus;
  summary: DailySummary | null;
  summaryStatus: "ok" | "none" | "failed";
}) {
  const m = dailyMarket(market);

  if (summaryStatus === "failed") {
    return (
      <p className={`max-w-measure ${R.body}`}>
        We couldn’t load the day’s summary just now. That’s a fault at our end;
        the filings below are unaffected.
      </p>
    );
  }
  if (!summary) {
    return (
      <p className={`max-w-measure ${R.body}`}>
        {status === "today"
          ? `No summary yet. The day’s read is written ${m.summaryTime}, once every filing is in.`
          : `No summary was written for this day. The team began publishing daily reads on ${dateLabel(m.id === "US" ? "2026-06-01" : "2026-05-11")}; earlier days carry the filings alone.`}
      </p>
    );
  }

  const paragraphs = summaryBody(summary)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const overview = summary.market_overview;

  return (
    <div className="max-w-measure">
      <h3 className="text-[20px] font-semibold leading-tight tracking-[-0.018em] text-foreground">
        {summary.headline}
      </h3>
      <div className="mt-4 space-y-3.5 text-lede text-foreground/85">
        {paragraphs.map((p, i) => (
          <p key={i}>{inlineBold(p)}</p>
        ))}
      </div>
      {cited.length > 0 ? (
        <div className="mt-6">
          <p className="eyebrow text-foreground/45">Filings this read cites</p>
          <ul className={`mt-2 border-t ${R.rule}`}>
            {cited.map((d, i) => {
              const who = insiderOf(d, market);
              const href = filingHref(d, market);
              const name =
                cleanCompanyName(d.company ?? "") ||
                displayTicker(d.ticker ?? "");

              return (
                <li
                  key={d.id ?? i}
                  className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 border-b ${R.rule} py-2.5 text-body`}
                >
                  <span className="min-w-0">
                    {href ? (
                      <Link className={`font-medium ${R.link}`} to={href}>
                        {name}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">
                        {name}
                      </span>
                    )}
                    <span className="text-foreground/55">
                      {" · "}
                      {cleanInsiderName(who.name)}
                    </span>
                  </span>
                  <span className={`tabular-nums ${R.label}`}>
                    {dayMoney(rowValue(d), m.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {overview && Number.isFinite(overview.pct) ? (
        <p
          className={`${cited.length > 0 ? "mt-4" : `mt-5 border-t ${R.rule} pt-3`} text-small text-foreground/60`}
        >
          <span className="font-semibold text-foreground/80">
            {overview.label}
          </span>{" "}
          <span
            className={`tabular-nums ${
              overview.pct > 0
                ? "text-positive"
                : overview.pct < 0
                  ? "text-negative"
                  : ""
            }`}
          >
            {overview.pct > 0 ? "+" : ""}
            {overview.pct.toFixed(2)}%
          </span>
          {overviewNarrative(summary)
            ? ` · ${overviewNarrative(summary)}`
            : null}
        </p>
      ) : null}
      <p className={`mt-3 ${R.label}`}>
        Written by the ddbx team, drafted with AI assistance after the close.
        Nothing here is advice.
      </p>
    </div>
  );
}

/** `**bold**` is the only markup the summary carries. Same shim the market
 *  home’s summary sheet uses; not worth a library. */
function inlineBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/* ─── Insider Index ──────────────────────────────────────────────────────── */

/** The slot. Renders only when src/lib/insider-index-slot.ts produced
 *  something; the module behind it is built on another branch. A day whose
 *  reading is not published yet (every edition until 7am the next morning)
 *  says when it lands rather than showing nothing or yesterday's number. */
function InsiderIndexSlot({ date, slot }: { date: string; slot: IndexSlot }) {
  if (slot.kind === "pending") {
    return (
      <p className={`max-w-measure ${R.body}`}>
        The Insider Index reading for {dateLabel(date)} lands at {slot.landsAt},
        once the day’s filings are all in. Each reading is published the morning
        after the session it covers.{" "}
        <Link className={R.link} to="/insider-index">
          The latest reading
        </Link>
        .
      </p>
    );
  }
  const { reading } = slot;

  return (
    <div className="max-w-measure">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-[44px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-foreground">
          {Math.round(reading.score)}
        </span>
        <span className="text-title text-foreground">{reading.tier.label}</span>
        {reading.weekChange != null && Number.isFinite(reading.weekChange) ? (
          <span className={`tabular-nums ${R.label}`}>
            {reading.weekChange > 0 ? "+" : ""}
            {Math.round(reading.weekChange)} on the week
          </span>
        ) : null}
      </div>
      <p className={`mt-3 ${R.body}`}>{reading.sentence}</p>
      {reading.windowSentence ? (
        <p className={`mt-2 ${R.label}`}>{reading.windowSentence}</p>
      ) : null}
      <p className={`mt-3 ${R.label}`}>
        Buying intensity against its own record, not net of selling: the feeds
        carry no disposals.
        {reading.method ? ` Method ${reading.method}.` : ""}
        {reading.path ? (
          <>
            {" "}
            <Link className={R.link} to={reading.path}>
              The full reading
            </Link>
            .
          </>
        ) : null}
      </p>
    </div>
  );
}

/* ─── The money ──────────────────────────────────────────────────────────── */

function MoneySection({
  market,
  model,
}: {
  market: MarketId;
  model: EditionModel;
}) {
  const big = model.biggest;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-foreground/45">Biggest buy by an insider</p>
        {big ? (
          <BiggestBuy big={big} market={market} />
        ) : (
          <p className={`mt-3 max-w-measure ${R.body}`}>
            None. Every purchase disclosed on this day was filed by a 10% holder
            with no board seat or office, and this slot is for the people
            running the company. Their filings are listed below.
          </p>
        )}
        {model.holders > 0 && big ? (
          <p className={`mt-3 max-w-measure ${R.label} leading-normal`}>
            Filings by 10% holders with no board seat or office are listed below
            and counted in the totals, but not ranked here: they are usually
            investment vehicles, not people running the business.
          </p>
        ) : null}
      </div>

      <div>
        <p className="eyebrow text-foreground/45">Cluster activity</p>
        {model.clusters.length === 0 ? (
          <p className={`mt-3 max-w-measure ${R.body}`}>
            None. No purchase disclosed on this day joined another insider’s buy
            in the same company within the previous fortnight.
          </p>
        ) : (
          <ul className={`mt-3 border-t ${R.rule}`}>
            {model.clusters.map((c) => (
              <li
                key={c.ticker}
                className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b ${R.rule} py-3.5`}
              >
                <span className="min-w-0">
                  <span className="text-body font-medium text-foreground">
                    {cleanCompanyName(c.company) || displayTicker(c.ticker)}
                  </span>{" "}
                  <TickerPill ticker={displayTicker(c.ticker)} />
                  <span className={`mt-1 block ${R.label}`}>
                    {clusterBuyers(c, market).map(({ name, row }, i) => {
                      const href = filingHref(row, market);

                      return (
                        <span key={name}>
                          {i > 0 ? ", " : ""}
                          {href ? (
                            <Link className={R.link} to={href}>
                              {cleanInsiderName(name)}
                            </Link>
                          ) : (
                            cleanInsiderName(name)
                          )}
                        </span>
                      );
                    })}
                    {" today"}
                  </span>
                </span>
                <span className={`tabular-nums ${R.label}`}>
                  {c.count} {c.count === 1 ? "buyer" : "buyers"} in{" "}
                  {c.windowDays} days
                  {c.tier === "strong" ? " · strong" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className={`mt-3 max-w-measure ${R.label} leading-normal`}>
          A cluster count is the pipeline’s own rolling annotation on each
          filing: how many distinct insiders bought that company inside the
          window ending on this purchase. It includes buyers from earlier days.{" "}
          <Link className={R.link} to="/learn/cluster-buying">
            What a cluster means
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/** The day's largest insider purchase, as one board row. */
function BiggestBuy({ big, market }: { big: AnyRow; market: MarketId }) {
  const m = dailyMarket(market);
  const who = insiderOf(big, market);
  const href = filingHref(big, market);

  return (
    <BoardRowList className="mt-3">
      <BoardRow
        badge={<TickerPill ticker={displayTicker(big.ticker ?? "")} />}
        facts={[{ label: "Verdict", value: verdictWord(big, market) }]}
        logo={<CompanyLogo size={56} ticker={big.ticker ?? ""} />}
        money={dayMoney(rowValue(big), m.currency)}
        name={
          cleanCompanyName(big.company ?? "") || displayTicker(big.ticker ?? "")
        }
        secondary={
          <>
            {cleanInsiderName(who.name)}
            {who.role ? `, ${who.role}` : ""}
            {" · "}
            {verdictLine(big, market)}
          </>
        }
        to={href ?? undefined}
      />
    </BoardRowList>
  );
}

/* ─── Every filing ───────────────────────────────────────────────────────── */

function FilingsList({
  cited,
  market,
  model,
}: {
  cited: Set<string>;
  market: MarketId;
  model: EditionModel;
}) {
  const m = dailyMarket(market);

  if (model.count === 0) {
    return <p className={`max-w-measure ${R.body}`}>No filings to list.</p>;
  }

  return (
    <>
      <BoardRowHeader
        className="mt-2"
        facts={["Verdict"]}
        money="Value"
        subject="Company and who bought"
      />
      <BoardRowList>
        {model.filings.map((d, i) => {
          const who = insiderOf(d, market);
          const href = filingHref(d, market);
          const value = rowValue(d);

          return (
            <BoardRow
              key={d.id ?? `${d.ticker}-${i}`}
              badge={<TickerPill ticker={displayTicker(d.ticker ?? "")} />}
              facts={[{ label: "Verdict", value: verdictWord(d, market) }]}
              logo={<CompanyLogo size={56} ticker={d.ticker ?? ""} />}
              money={dayMoney(value, m.currency)}
              name={
                cleanCompanyName(d.company ?? "") ||
                displayTicker(d.ticker ?? "")
              }
              position={i + 1}
              secondary={
                <>
                  {cleanInsiderName(who.name)}
                  {who.role ? `, ${who.role}` : ""}
                  {" · "}
                  {verdictLine(d, market)}
                  {isHolderOnly(d, market) ? " · No board seat or office" : ""}
                  {d.id && cited.has(d.id) ? " · Cited in the read" : ""}
                </>
              }
              to={href ?? undefined}
            />
          );
        })}
      </BoardRowList>
      <LogoDevAttribution className="mt-4" />
    </>
  );
}

/* ─── Standing copy ──────────────────────────────────────────────────────── */

/** What an edition is, and the terms on it. Rail variant, so the page
 *  alternates: tiles, prose, rows, list, then this two-column reference. */
function WhatThisIs({ market }: { market: MarketId }) {
  const m = dailyMarket(market);
  const us = m.id === "US";

  return (
    <>
      <SeoSection className="mt-12" title="What this is" variant="rail">
        <div className={`space-y-3 ${R.body}`}>
          <p>
            One page per trading day, permanent. It lists every open-market
            purchase {m.label} {m.noun} disclosed that day as the{" "}
            {us ? "SEC" : "exchange"} published it
            {us
              ? ", made directly and not under a pre-arranged 10b5-1 plan, whatever its size"
              : ""}
            , with the verdict our method reached on each, the day’s largest
            cheque, and any company where more than one insider was buying. The
            read at the top is the summary the team publishes after the close.
          </p>
          <p>
            {us
              ? "A Form 4 has to be filed within two business days of the trade, so a purchase usually appears here a day or two after it was made. The date on this page is the filing date."
              : "A director’s purchase has to be announced within a few business days of the trade, so it usually appears here a day or two after it was made. The date on this page is the announcement date, which is the first day anyone outside the company could act on it."}
          </p>
          <p>
            Values are as filed
            {us
              ? ", in dollars"
              : ", converted to sterling where a filing was made in another currency"}
            . Nothing here is advice.{" "}
            <Link className={R.link} to="/how-it-works">
              How the rating is reached
            </Link>
            .
          </p>
        </div>
      </SeoSection>

      <SeoSection title="Terms on this page" variant="rail">
        <dl className={`space-y-4 ${R.body}`}>
          <div>
            <dt className="font-semibold text-foreground">
              Open-market purchase
            </dt>
            <dd className="mt-1">
              Shares bought at the market price with the insider’s own money.
              Awards, vestings, option exercises and placings are disclosed the
              same way and are not counted.{" "}
              <Link className={R.link} to="/learn/open-market-buy">
                More
              </Link>
              .
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Verdict</dt>
            <dd className="mt-1">
              The rating our six checks reached: significant, noteworthy, minor
              or routine. A filing marked “not analysed” was screened out at
              triage as unlikely to be informative; one marked “pending” has
              cleared triage or has not reached it yet.
              {us
                ? " A US purchase under $50k is not screened unless it matches one of our strategy patterns, so it is marked “unscreened”: listed, not rated."
                : ""}
            </dd>
          </div>
          {us ? (
            <div>
              <dt className="font-semibold text-foreground">10% holder</dt>
              <dd className="mt-1">
                Anyone holding 10% of a company files the same Form 4 as its
                officers and directors, and is usually an investment vehicle
                rather than someone running the business. Their purchases are
                listed and counted in the day’s totals, marked, and left out of
                the biggest-buy slot, as the boards leave them out of their
                rankings.
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold text-foreground">Cluster</dt>
            <dd className="mt-1">
              Several insiders buying the same company within a fortnight. One
              purchase is one person’s opinion; a cluster is a board agreeing
              with itself.{" "}
              <Link className={R.link} to="/learn/cluster-buying">
                More
              </Link>
              .
            </dd>
          </div>
        </dl>
      </SeoSection>
    </>
  );
}
