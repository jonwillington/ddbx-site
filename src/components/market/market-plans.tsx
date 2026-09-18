// Insider buying programmes — one row per announced purchase, from the day it
// is announced to the day it is bought or called off.
//
// ONE STORY PER ROW, IN PLAIN WORDS. The reader is assumed never to have heard
// of DART, of FSCMA art. 173-3, or of the word "declaration". So the row says
// who is buying and what they are to the company, roughly what it is worth in
// a currency they hold, where the plan has got to, and whether it is a big one.
// Nothing on the row is a term of art: "Announced", "Buying now", "Bought",
// "Called off". The statute is one click away under the subtitle, not stacked
// above the list as an introduction.
//
// The DATA is deliberately not a MarketDealing (see MarketPlan in
// lib/markets/types.ts): every affordance a dealing has — a price paid, a
// return since, a trade date — is wrong for a plan, and mapping one onto the
// other would quietly assert things that are not true. The LAYOUT, on the
// other hand, is the dealings table's, column for column. A page that stacks
// these above the completed purchases has to read as one table twice, not as a
// card wall followed by a table: the reader is comparing the two lists, and
// they cannot compare what does not line up.
//
// So the row geometry here mirrors MarketRow exactly — w-28 date, w-20 ticker,
// flex-1 company + insider, the market's value column, then the dealings
// table's trend + performance width fused into one stage cell, then the w-40
// action column. Same hairline cell rules, same type sizes, same header
// treatment with its tooltips.
//
// Four things shape it, all learned from the Korean feed:
//
//   1. GROUPED BY WHERE THE PLAN HAS GOT TO, not by filed date. A flat list in
//      filing order interleaves plans whose window opens next month with ones
//      that finished weeks ago and ones the filer has since called off. Where
//      a plan sits against its window IS the plan; sorting by the filing date
//      buried the only axis that matters. Only "Buying now" is expanded on
//      arrival — the rest announce their count and wait, so the completed
//      purchases below stay within reach.
//   2. THE MONEY LEADS IN THE READER'S CURRENCY. ₩1,500,000,000 is a number,
//      not a quantity. The approximate sterling figure is the headline and the
//      filed currency sits under it, so the row can be sized on sight and the
//      filing's own figure is still on the page.
//   3. THE STAGE IS A SENTENCE, not a date range. "Buying now / until 18 Sept ·
//      75% bought" says everything two dates and a progress bar were asking the
//      reader to work out for themselves.
//   4. THE LAST COLUMN IS A SIZE, NOT A RATING. Nothing here has been screened,
//      so the only verdict it can honestly carry is how big the plan is against
//      a stated threshold — and the header says what that threshold is.
//
// The notice is rendered from the payload rather than written here, so the
// wording travels with the data and one market cannot drift from another. It
// is collapsed behind a link: it is three paragraphs of statute, which is
// reference material, and the section subtitle now does the introducing.

import type { ReactNode } from "react";
import type { MarketPlan, PlansPayload } from "@/lib/markets/types";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InformationCircleIcon } from "@heroicons/react/20/solid";

import { shortDate } from "./market-utils";

import { chip } from "@/components/chip";
import { CompanyLogo } from "@/components/company-logo";
import { Skeleton } from "@/components/skeleton";
import { Tooltip } from "@/components/tooltip";

const RULE = "border-hairline dark:border-separator";
const CARD = `rounded-xl border ${RULE} bg-sheet px-4 py-3.5 dark:bg-surface`;

/** The dealings table's cell rule, verbatim. Every column divider in this
 *  component uses it so the two tables share one hairline weight. */
const CELL = "border-r border-black/[0.06] dark:border-white/[0.06]";

/* ─── Column widths ──────────────────────────────────────────────────────
 *
 * Mirrors MarketRowHeader. `VALUE` is the only one a market sets itself
 * (MarketConfig.priceFormat.valueColumnClass — Korea widens it to w-36,
 * because an exact won figure runs to fourteen characters); `window` is the
 * dealings table's trend (w-24) + performance (w-24) fused, because a plan has
 * neither and the stage sentence needs the room.
 */
const COL = {
  date: "w-28",
  ticker: "w-20",
  window: "w-48",
  action: "w-40",
} as const;

/* ─── Where the plan has got to ──────────────────────────────────────── */

type StageId =
  | "open"
  | "upcoming"
  | "unstated"
  | "bought"
  | "empty"
  | "withdrawn";

interface Stage {
  id: StageId;
  /** Two or three plain words. The row's primary reading, and the only thing
   *  a skimming reader is expected to take from the column. */
  headline: string;
  /** One small line of supporting fact — a date, and how much has been bought
   *  when anything has. Null when there is nothing honest to add. */
  detail: string | null;
  tone: string;
}

/** Percent of the announced amount that has actually been bought, or null when
 *  the two figures cannot be divided. Capped at 100: filings routinely execute
 *  a few percent over the announced value (rounding, and the 70–130% band the
 *  rule allows), and "117% bought" reads as a bug rather than as diligence. */
function boughtPercent(p: MarketPlan): number | null {
  if (!p.plannedValue || p.plannedValue <= 0) return null;
  if (p.executedValue == null || p.executedValue <= 0) return null;

  return Math.min(100, Math.round((p.executedValue / p.plannedValue) * 100));
}

/** " · 75% bought", or " · ₩320m bought so far" when there is an executed
 *  figure but nothing to measure it against. Empty when nothing has been
 *  bought, because "0% bought" is a prompt dressed as a measurement. */
function boughtSuffix(
  p: MarketPlan,
  formatValue: (v: number) => string,
): string {
  const pct = boughtPercent(p);

  if (pct != null) return ` · ${pct}% bought`;
  if (p.executedValue != null && p.executedValue > 0)
    return ` · ${compactValue(p.executedValue, formatValue)} bought so far`;

  return "";
}

function stage(
  p: MarketPlan,
  today: string,
  formatValue: (v: number) => string,
): Stage {
  if (p.isWithdrawn)
    return {
      id: "withdrawn",
      headline: "Called off",
      detail: `withdrew ${fmtShort(p.filedDate)}`,
      tone: "text-foreground/45",
    };
  if (!p.windowStart)
    return {
      id: "unstated",
      headline: "Announced",
      detail: "no start date given",
      tone: "text-foreground/80",
    };
  if (today < p.windowStart)
    return {
      id: "upcoming",
      headline: "Announced",
      detail:
        daysBetween(today, p.windowStart) === 0
          ? "buying can start today"
          : `buying can start ${fmtShort(p.windowStart)}`,
      tone: "text-foreground/80",
    };
  if (p.windowEnd && today <= p.windowEnd)
    return {
      id: "open",
      // Emerald is reserved for this one stage across the whole section: the
      // colour means "something can happen today", nothing else.
      headline: "Buying now",
      detail: `until ${fmtShort(p.windowEnd)}${boughtSuffix(p, formatValue)}`,
      tone: "text-emerald-600 dark:text-emerald-400",
    };
  if (p.executedValue != null && p.executedValue > 0)
    return {
      id: "bought",
      headline: "Bought",
      detail: `${p.windowEnd ? `finished ${fmtShort(p.windowEnd)}` : "window closed"}${boughtSuffix(p, formatValue)}`,
      tone: "text-foreground/80",
    };

  return {
    id: "empty",
    headline: "Nothing bought",
    detail: p.windowEnd ? `window closed ${fmtShort(p.windowEnd)}` : null,
    tone: "text-foreground/45",
  };
}

/** The groups, in the order a reader cares about them, each introduced by one
 *  beginner sentence. Only "Buying now" is expanded on arrival: every other
 *  group is either waiting or over, and leaving them open pushed the purchases
 *  table thousands of pixels down the page. Empty groups render nothing. */
const GROUPS: {
  id: string;
  stages: StageId[];
  title: string;
  blurb: string;
  collapsed?: boolean;
}[] = [
  {
    id: "open",
    stages: ["open"],
    title: "Buying now",
    blurb:
      "The notice period is over and the shares can be bought on any day from here to the date shown.",
  },
  {
    id: "upcoming",
    stages: ["upcoming", "unstated"],
    title: "Announced, not started",
    blurb:
      "They have said what they intend to buy and are waiting out the notice period before they are allowed to start.",
    collapsed: true,
  },
  {
    id: "bought",
    stages: ["bought"],
    title: "Bought",
    blurb: "The time ran out and shares were bought against the announcement.",
    collapsed: true,
  },
  {
    id: "empty",
    stages: ["empty"],
    title: "Closed without buying",
    blurb:
      "The time ran out and no purchase has been filed against the announcement.",
    collapsed: true,
  },
  {
    id: "withdrawn",
    stages: ["withdrawn"],
    title: "Called off",
    blurb:
      "The insider cancelled before buying. Kept on the page, because a large holder calling off a purchase is worth knowing too.",
    collapsed: true,
  },
];

/* ─── Size ───────────────────────────────────────────────────────────── */

/** A size, not a rating. Nothing on a Korean page has been screened, so the
 *  only verdict this column can honestly carry is "this one is large", against
 *  a threshold the header states out loud. Either limb qualifies: a small
 *  company's 1% and a large one's £500,000 are both worth a second look, and
 *  requiring both would silently drop one of them. */
const BIG_PERCENT = 1;
const BIG_GBP = 500_000;

const BIG_HELP = "Size only, not a rating. 1% of the company or £500k and up.";

function isBig(p: MarketPlan): boolean {
  return (
    (p.plannedPercent != null && p.plannedPercent >= BIG_PERCENT) ||
    (p.plannedValueGbp != null && p.plannedValueGbp >= BIG_GBP)
  );
}

/* ─── Dates + numbers ────────────────────────────────────────────────── */

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(fmtIso(b)) - Date.parse(fmtIso(a));

  return Math.max(0, Math.round(ms / 86400000));
}

/** Accepts YYYYMMDD (as filed) or YYYY-MM-DD. */
function fmtIso(d: string): string {
  return /^\d{8}$/.test(d)
    ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`
    : d;
}

/** Day + month only — the year is noise inside a window that is at most a
 *  month long and always within the next few. */
function fmtShort(d: string | null): string {
  if (!d) return "";

  return new Date(fmtIso(d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** Mirrors the private `formatCompactValue` in market-row.tsx: swap the digit
 *  run inside an already-formatted amount for its compact notation, keeping
 *  the market's own currency symbol and placement. Duplicated rather than
 *  exported because the row's copy is local to that file; both exist so the
 *  mobile one-liner can carry a won figure without running off the screen. */
function compactValue(value: number, format: (v: number) => string): string {
  const abs = Math.abs(value);

  if (abs < 10_000) return format(value);

  const sample = format(abs);
  const firstDigit = sample.search(/\d/);
  const lastDigit = sample.search(/\d(?!.*\d)/);

  if (firstDigit < 0 || lastDigit < firstDigit) return format(value);

  const compact = new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(abs)
    .replaceAll("K", "k")
    .replaceAll("M", "m")
    .replaceAll("B", "b");

  return `${value < 0 ? "-" : ""}${sample.slice(0, firstDigit)}${compact}${sample.slice(lastDigit + 1)}`;
}

/** KRX codes arrive bare from DART and venue-suffixed from the price side.
 *  The reader wants the six digits either way. */
function displayTicker(ticker: string): string {
  return ticker.replace(/\.(KS|KQ)$/i, "");
}

/* ─── Section ────────────────────────────────────────────────────────── */

export function MarketPlans({
  title,
  subtitle,
  emptyLabel,
  fetchPlans,
  formatValue,
  valueColumnClass = "w-24",
  locale = "en-US",
}: {
  title: string;
  subtitle?: string;
  emptyLabel?: string;
  fetchPlans: () => Promise<PlansPayload>;
  /** Market-owned money formatter, so KRW renders as KRW. */
  formatValue: (v: number) => string;
  /** MarketConfig.priceFormat.valueColumnClass. The two tables on the page
   *  stop sharing a value column the moment these differ, so the default
   *  matches MarketRow's rather than any one market's (Korea sets w-36). */
  valueColumnClass?: string;
  /** MarketConfig.locale. Default matches shortDate's own. */
  locale?: string;
}) {
  const [data, setData] = useState<PlansPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    fetchPlans()
      .then((d) => {
        if (live) setData(d);
      })
      .catch(() => {
        if (live) setFailed(true);
      });

    return () => {
      live = false;
    };
  }, [fetchPlans]);

  const today = new Date().toISOString().slice(0, 10);
  const plans = useMemo(() => data?.plans ?? [], [data]);

  /** Bucket once, and sort each bucket by what its readers are waiting on:
   *  the open windows by which closes first, the upcoming ones by which
   *  opens first, the finished ones newest-announced first. */
  const groups = useMemo(() => {
    const staged = plans.map((p) => ({
      plan: p,
      s: stage(p, today, formatValue),
    }));

    return GROUPS.map((g) => {
      const rows = staged.filter((r) => g.stages.includes(r.s.id));

      rows.sort((a, b) => {
        if (g.id === "open")
          return (a.plan.windowEnd ?? "").localeCompare(b.plan.windowEnd ?? "");
        if (g.id === "upcoming")
          return (a.plan.windowStart ?? "").localeCompare(
            b.plan.windowStart ?? "",
          );

        return b.plan.filedDate.localeCompare(a.plan.filedDate);
      });

      return { ...g, rows };
    }).filter((g) => g.rows.length > 0);
  }, [plans, today, formatValue]);

  // A market whose declarations fail to load should lose the section, not the
  // page — the dealings feed below is independent and still worth reading.
  if (failed) return null;

  return (
    <section className="mt-8">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1 text-[13.5px] leading-[1.6] text-foreground/60">
          {subtitle}
        </p>
      ) : null}

      {/* The statute, one click down. It used to sit here as a card: roughly
          130 words of regulation between the heading and the first row, which
          is reference material posing as an introduction. The subtitle above
          now does the introducing. */}
      {data?.notice ? <Notice notice={data.notice} /> : null}

      {/* Loading holds the arrived geometry — same container, same header,
          same row height — so nothing under it jumps when the rows land. */}
      {!data ? (
        <div className="mt-6">
          <Skeleton className="h-4 w-52 rounded" />
          <Skeleton className="mt-2 h-3 w-80 rounded" />
          <div
            className={`mt-3 overflow-hidden rounded-xl border ${RULE} bg-sheet dark:bg-surface`}
          >
            <PlanRowHeader valueColumnClass={valueColumnClass} />
            <div className="divide-y divide-black/[0.06] dark:divide-separator">
              {[0, 1, 2].map((i) => (
                <PlanRowSkeleton key={i} valueColumnClass={valueColumnClass} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {data && plans.length === 0 ? (
        <p className="mt-4 text-[13.5px] text-foreground/55">
          {emptyLabel ?? "Nothing announced yet."}
        </p>
      ) : null}

      {groups.map((g) => (
        <PlanGroup
          key={g.id}
          blurb={g.blurb}
          collapsed={g.collapsed}
          count={g.rows.length}
          formatValue={formatValue}
          locale={locale}
          rows={g.rows}
          title={g.title}
          valueColumnClass={valueColumnClass}
        />
      ))}
    </section>
  );
}

/** The payload's explainer, collapsed to a link.
 *
 *  Everything in it is statute — thresholds, notice periods, the 70–130% band
 *  the purchase has to land inside — and none of it is needed to read a row
 *  now that the rows say "Buying now" and "Bought" rather than naming a legal
 *  instrument. So the whole thing, headline and all, opens on request and is a
 *  single line of chrome until then. Still worded by the server, so it cannot
 *  drift from what the rows mean. */
function Notice({ notice }: { notice: NonNullable<PlansPayload["notice"]> }) {
  const [expanded, setExpanded] = useState(false);
  const paras = notice.body.split("\n\n").filter(Boolean);

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
        <button
          aria-expanded={expanded}
          className="underline underline-offset-2 text-foreground/60 hover:opacity-70"
          type="button"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide how the rule works" : "How the rule works"}
        </button>
        {notice.learnMorePath ? (
          <Link
            className="underline underline-offset-2 text-foreground/60 hover:opacity-70"
            to={notice.learnMorePath}
          >
            {notice.learnMoreLabel ?? "Learn more"}
          </Link>
        ) : null}
      </div>

      {expanded ? (
        <div className={`mt-3 ${CARD}`}>
          <h3 className="text-[14px] font-semibold leading-[1.35] text-foreground">
            {notice.headline}
          </h3>
          {paras.map((para) => (
            <p
              key={para.slice(0, 24)}
              className="mt-2 text-[13.5px] leading-[1.6] text-foreground/65"
            >
              {para}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlanGroup({
  title,
  blurb,
  count,
  rows,
  collapsed,
  formatValue,
  valueColumnClass,
  locale,
}: {
  title: string;
  blurb: string;
  count: number;
  rows: { plan: MarketPlan; s: Stage }[];
  collapsed?: boolean;
  formatValue: (v: number) => string;
  valueColumnClass: string;
  locale: string;
}) {
  const [open, setOpen] = useState(!collapsed);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
          <span className="ml-2 text-[13px] font-normal tabular-nums text-foreground/45">
            {count}
          </span>
        </h3>
        {collapsed ? (
          <button
            className="text-[13px] underline underline-offset-2 hover:opacity-70"
            type="button"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      <p className="mt-0.5 text-[13px] leading-[1.55] text-foreground/55">
        {blurb}
      </p>

      {open ? (
        <div
          className={`mt-3 overflow-hidden rounded-xl border ${RULE} bg-sheet dark:bg-surface`}
        >
          <PlanRowHeader valueColumnClass={valueColumnClass} />
          <ul className="divide-y divide-black/[0.06] dark:divide-separator">
            {rows.map(({ plan, s }) => (
              <PlanRow
                key={plan.key}
                formatValue={formatValue}
                locale={locale}
                plan={plan}
                s={s}
                valueColumnClass={valueColumnClass}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** A column header label with an info tooltip. Same construction as
 *  MarketRowHeader's (which is private to that file), so the two tables'
 *  headers behave identically. */
function HeaderLabel({
  help,
  children,
}: {
  help: string;
  children: ReactNode;
}) {
  return (
    <Tooltip
      className="inline-flex items-center gap-1 cursor-help align-middle"
      content={help}
    >
      {children}
      <InformationCircleIcon className="h-3 w-3 shrink-0 text-muted/40" />
    </Tooltip>
  );
}

/** Header for the programmes table. Deliberately not MarketRowHeader: the
 *  labels all differ (a plan has no disclosure, no trend and no return), and
 *  its column set is driven by MarketConfig.hiddenColumns, which describes the
 *  dealings feed. The styling is copied verbatim.
 *
 *  Every help string is written for someone who has never seen one of these
 *  filings before. No statute, no "declaration", no "consideration". */
function PlanRowHeader({ valueColumnClass }: { valueColumnClass: string }) {
  return (
    <div className="hidden md:flex items-center text-[10px] uppercase tracking-wider text-muted/80 font-medium select-none border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.05]">
      <div className={`${COL.date} shrink-0 px-3 py-1.5 ${CELL}`}>
        <HeaderLabel help="The day the insider told the market they intended to buy. Nothing had been bought yet at this point.">
          Announced
        </HeaderLabel>
      </div>
      <div className={`${COL.ticker} shrink-0 px-2 py-1.5 text-center ${CELL}`}>
        <HeaderLabel help="The exchange code for the company being bought.">
          Ticker
        </HeaderLabel>
      </div>
      <div className={`flex-1 min-w-0 px-3 py-1.5 ${CELL}`}>
        <HeaderLabel help="The company, the person or firm doing the buying, and what they are to it. Someone who already owns a lot of the company is usually more telling than a job title.">
          Who and where
        </HeaderLabel>
      </div>
      <div
        className={`${valueColumnClass} shrink-0 px-3 py-1.5 text-right ${CELL}`}
      >
        <HeaderLabel help="How much they said they would spend, in pounds at today's rate, with the figure they actually filed underneath. Intended, not spent.">
          Plans to buy
        </HeaderLabel>
      </div>
      <div className={`${COL.window} shrink-0 px-3 py-1.5 ${CELL}`}>
        <HeaderLabel help="How far the plan has got: announced and waiting, buying right now, finished, or called off. Where anything has been bought, how much of the plan that covers.">
          Where it stands
        </HeaderLabel>
      </div>
      <div className={`${COL.action} shrink-0 px-2 py-1.5 text-center`}>
        <HeaderLabel
          help={`How large the plan is. ${BIG_HELP} Nothing on this page has been screened or scored.`}
        >
          Size
        </HeaderLabel>
      </div>
    </div>
  );
}

/** Loading placeholder in the arrived geometry — same widths, same cell
 *  rules, same row height as PlanRow. */
function PlanRowSkeleton({ valueColumnClass }: { valueColumnClass: string }) {
  return (
    <div className="w-full">
      <div className="md:hidden px-3.5 py-2.5 flex items-center gap-2.5">
        <Skeleton circle className="shrink-0" h={28} w={28} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-3.5 w-1/2 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
        </div>
        <Skeleton className="h-4 w-14 rounded" />
      </div>

      <div className="hidden md:flex items-stretch">
        <div
          className={`${COL.date} shrink-0 px-3 py-2.5 flex items-center ${CELL}`}
        >
          <Skeleton className="h-3.5 w-14 rounded" />
        </div>
        <div
          className={`${COL.ticker} shrink-0 px-2 py-2.5 flex items-center justify-center ${CELL}`}
        >
          <Skeleton className="h-4 w-11 rounded" />
        </div>
        <div
          className={`flex-1 min-w-0 px-3 py-2.5 flex items-center gap-2.5 ${CELL}`}
        >
          <Skeleton circle className="shrink-0" h={28} w={28} />
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className="h-3.5 w-1/2 rounded" />
            <Skeleton className="h-3 w-2/5 rounded" />
          </div>
        </div>
        <div
          className={`${valueColumnClass} shrink-0 px-3 py-2.5 flex flex-col items-end justify-center gap-1 ${CELL}`}
        >
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <div
          className={`${COL.window} shrink-0 px-3 py-2.5 flex flex-col justify-center gap-1 ${CELL}`}
        >
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-2.5 w-20 rounded" />
        </div>
        <div
          className={`${COL.action} shrink-0 px-3 py-2.5 flex items-center justify-center`}
        >
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

/* ─── The row ────────────────────────────────────────────────────────── */

/** One declaration, in the dealings table's column geometry. Not a button:
 *  there is no drawer behind a plan, and a row that looks clickable and isn't
 *  is worse than one that doesn't. */
function PlanRow({
  plan: p,
  s,
  formatValue,
  valueColumnClass,
  locale,
}: {
  plan: MarketPlan;
  s: Stage;
  formatValue: (v: number) => string;
  valueColumnClass: string;
  locale: string;
}) {
  const ticker = displayTicker(p.ticker);

  // STERLING LEADS. ₩1,500,000,000 cannot be sized on sight by anyone who does
  // not deal in won, so the approximate pound figure is the headline and the
  // filed figure sits under it, compact. A plan that states no money usually
  // still states a share count; what the cell must never do is show an em-dash
  // where a figure goes. "Not stated" is a fact about the filing, "—" is the
  // page shrugging.
  const wonCompact =
    p.plannedValue != null ? compactValue(p.plannedValue, formatValue) : null;
  const shares =
    p.plannedShares != null ? p.plannedShares.toLocaleString("en-GB") : null;
  // "15,000 shares" wraps to two lines in a column sized for a currency
  // figure, so the unit drops to the line beneath — the same slot the won
  // reading uses when there is a money figure.
  const lead = p.plannedValueSecondary ?? wonCompact ?? shares ?? "Not stated";
  const under =
    p.plannedValueSecondary != null
      ? wonCompact
      : wonCompact == null && shares != null
        ? "shares"
        : null;
  const valueStated = p.plannedValue != null || shares != null;
  // A filed 0 is a rounding artefact, not a measurement: rendering "0% of the
  // company" would state a number the filing does not contain.
  const stake =
    p.plannedPercent != null && p.plannedPercent > 0
      ? `${p.plannedPercent}% of the company`
      : null;

  // Who is buying, and what they are to the company — "Jung Phil Moon, CEO",
  // "Sejong Corp., controlling shareholder". A job title when there is a
  // readable one, otherwise what they hold, which the filing threshold makes
  // the more telling fact anyway. The filer's own Korean wording for the
  // purpose stays in the title attribute: it is the record, not the reading,
  // and a reader who cannot parse it gains nothing from it sitting in the row.
  const insiderLine = [p.insiderName, p.insiderRole ?? p.holderStatus]
    .filter(Boolean)
    .join(", ");
  const insiderTitle =
    [insiderLine, p.purposeLabel, p.purposeHint, p.purposeRaw]
      .filter(Boolean)
      .join(" — ") || undefined;

  const big = isBig(p);

  const companyClass = p.isWithdrawn
    ? "line-through decoration-foreground/30 text-foreground/60"
    : "";

  return (
    <li
      className={
        p.isWithdrawn
          ? "opacity-65 bg-black/[0.025] dark:bg-white/[0.04]"
          : undefined
      }
    >
      {/* ── Mobile (<md) ──
          MarketRow's one-liner: logo · company · what they plan to spend. The
          stage sits under the name because on a plan it is the whole point —
          a phone reader needs to know whether this can happen today.
          Everything else (who they are, the size verdict, the exact window) is
          desktop. */}
      <div className="md:hidden px-3.5 py-2.5 flex items-center gap-2.5">
        <CompanyLogo
          domain={p.logoDomain}
          monogramText={p.company}
          size={28}
          ticker={ticker}
        />
        <div className="flex-1 min-w-0">
          <div
            className={`truncate text-[15px] font-semibold leading-tight ${companyClass}`}
          >
            {p.company}
          </div>
          <div className={`mt-0.5 truncate text-[11px] font-medium ${s.tone}`}>
            {s.headline}
          </div>
        </div>
        <span className="shrink-0 text-right leading-tight">
          <span
            className={`block tabular-nums ${
              valueStated
                ? "text-[15px] font-semibold"
                : "text-[13px] text-muted"
            }`}
          >
            {lead}
          </span>
          {under ? (
            <span className="block text-[10px] tabular-nums text-muted/75">
              {under}
            </span>
          ) : null}
        </span>
      </div>

      {/* ── Desktop (md+) ── */}
      <div className="hidden md:flex items-stretch">
        <div
          className={`${COL.date} shrink-0 px-3 py-2.5 flex flex-col justify-center ${CELL}`}
        >
          {/* The date alone. "30 days' notice" used to sit under it and was
              the rule restated on every row: the notice period is the same
              for everyone, so it told the reader nothing about this filing,
              and the stage column already says when buying can start. */}
          <div className="text-xs text-foreground/90 font-medium leading-tight">
            {shortDate(fmtIso(p.filedDate), locale)}
          </div>
        </div>

        <div
          className={`${COL.ticker} shrink-0 px-2 py-2.5 flex items-center justify-center ${CELL}`}
        >
          {ticker ? (
            <span className="font-mono text-[11px] font-semibold px-1.5 py-0 rounded bg-hairline dark:bg-surface-secondary">
              {ticker}
            </span>
          ) : null}
        </div>

        <div
          className={`flex-1 min-w-0 px-3 py-2.5 flex items-center gap-2.5 ${CELL}`}
        >
          <CompanyLogo
            domain={p.logoDomain}
            monogramText={p.company}
            size={28}
            ticker={ticker}
          />
          <div className="flex-1 min-w-0">
            <div
              className={`text-[13px] font-medium truncate leading-tight ${companyClass}`}
            >
              {p.company}
            </div>
            {/* Who, then where. The chip is shrink-0 inside the flex row
                rather than inside the truncating span, so the board survives
                a long company officer's name instead of being the first
                thing clipped. */}
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span
                className="text-[11px] text-muted truncate"
                title={insiderTitle}
              >
                {insiderLine}
              </span>
              {p.venue ? (
                <span className={`${chip()} shrink-0 text-muted`}>
                  {p.venue}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={`${valueColumnClass} shrink-0 px-3 py-2.5 flex flex-col items-end justify-center ${CELL}`}
        >
          <div
            className={`tabular-nums whitespace-nowrap ${
              valueStated ? "text-sm font-semibold" : "text-[13px] text-muted"
            }`}
          >
            {lead}
          </div>
          {under ? (
            <div className="text-[10px] tabular-nums text-muted/75 leading-tight">
              {under}
            </div>
          ) : null}
          {/* The reason the filing exists at all: the announcement is
              triggered by the size of the stake, not by the sum of money. */}
          {stake ? (
            <div className="text-[10px] tabular-nums text-muted/75 leading-tight whitespace-nowrap">
              {stake}
            </div>
          ) : null}
        </div>

        <div
          className={`${COL.window} shrink-0 px-3 py-2.5 flex flex-col justify-center ${CELL}`}
        >
          <div className={`text-[13px] font-medium leading-tight ${s.tone}`}>
            {s.headline}
          </div>
          {s.detail ? (
            <div className="text-[10px] tabular-nums text-muted/75 mt-0.5">
              {s.detail}
            </div>
          ) : null}
        </div>

        {/* A SIZE, not a rating. Empty when the plan is under the threshold,
            because the honest alternative — "small" — is a judgement, and
            nothing on this page has been screened. */}
        <div
          className={`${COL.action} shrink-0 px-3 py-2.5 flex items-center justify-center`}
        >
          {big ? (
            <span
              className={`${chip()} bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/10 dark:text-brand-tan`}
              title={BIG_HELP}
            >
              Big
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
