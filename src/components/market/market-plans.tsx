// Advance declarations — trades an insider has publicly committed to but has
// NOT yet made.
//
// The DATA is deliberately not a MarketDealing (see MarketPlan in
// lib/markets/types.ts): every affordance a dealing has — a price paid, a
// return since, a trade date — is wrong for a declaration, and mapping one
// onto the other would quietly assert things that are not true. The LAYOUT,
// on the other hand, is the dealings table's, column for column. A page that
// stacks fifty declarations above fifty completed purchases has to read as one
// table twice, not as a card wall followed by a table: the reader is comparing
// the two lists, and they cannot compare what does not line up.
//
// So the row geometry here mirrors MarketRow exactly — w-28 date, w-20 ticker,
// flex-1 company + insider, the market's value column, then the dealings
// table's trend + performance width fused into one Window cell, then the w-40
// action column. Same hairline cell rules, same type sizes, same header
// treatment with its tooltips.
//
// Three things shape it, all learned from the Korean feed:
//
//   1. GROUPED BY WINDOW STATE, not by filed date. A flat sixty-row list in
//      filing order interleaves declarations whose window opens next month
//      with ones that closed weeks ago and ones the filer has since called
//      off. Where a declaration sits against its window IS the declaration;
//      sorting by the filing date buried the only axis that matters. Only the
//      open group is expanded on arrival — the other two announce their count
//      and wait, so the completed purchases below stay within reach.
//   2. THE ROW LEADS WITH THE READING. The Window cell states where the
//      declaration stands as a sentence — "Open until 18 Sep", "Opens in 2
//      days" — with the literal date range beneath it. The reader should not
//      have to subtract two dates to learn whether anything can happen today.
//   3. THE FOLLOW-THROUGH IS THE PAYOFF. A declaration with executed filings
//      against it can show what actually happened, and about a quarter of them
//      can. It sits in the action column as a proportion of what was promised.
//
// The notice is rendered from the payload rather than written here, so the
// wording travels with the data and one market cannot drift from another. Only
// its first paragraph is shown up front — the full text is three paragraphs of
// statute, which is reference material, not an introduction.

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
 * because an exact won figure runs to fourteen characters); `WINDOW` is the
 * dealings table's trend (w-24) + performance (w-24)
 * fused, because a declaration has neither and the sentence needs the room.
 */
const COL = {
  date: "w-28",
  ticker: "w-20",
  window: "w-48",
  action: "w-40",
} as const;

/* ─── Window state ───────────────────────────────────────────────────── */

type StateId = "open" | "upcoming" | "closed" | "withdrawn" | "unstated";

interface WindowState {
  id: StateId;
  /** Where the declaration stands, as a sentence. The row's primary reading. */
  label: string;
  tone: string;
  /** True once there is nothing left to wait for — a shut window or a
   *  cancellation. Suppresses "Nothing filed yet", which is a prompt, not a
   *  verdict, and reads as an accusation against a plan that is already over. */
  settled: boolean;
}

/** How near an opening has to be before it's worth counting down to. Past
 *  this the date itself is the more useful fact: "opens in 47 days" is a
 *  number the reader then has to turn back into a date. */
const COUNTDOWN_DAYS = 14;

function windowState(p: MarketPlan, today: string): WindowState {
  if (p.isWithdrawn)
    return {
      id: "withdrawn",
      label: "Withdrawn",
      tone: "text-foreground/45",
      settled: true,
    };
  if (!p.windowStart)
    return {
      id: "unstated",
      label: "Window not stated",
      tone: "text-foreground/45",
      settled: false,
    };
  if (today < p.windowStart) {
    const days = daysBetween(today, p.windowStart);

    return {
      id: "upcoming",
      label:
        days === 0
          ? "Opens today"
          : days <= COUNTDOWN_DAYS
            ? `Opens in ${days} day${days === 1 ? "" : "s"}`
            : `Opens ${fmtShort(p.windowStart)}`,
      tone: "text-foreground/80",
      settled: false,
    };
  }
  if (p.windowEnd && today <= p.windowEnd)
    return {
      id: "open",
      // Emerald is reserved for this one state across the whole section: the
      // colour means "something can happen today", nothing else.
      label: `Open until ${fmtShort(p.windowEnd)}`,
      tone: "text-emerald-600 dark:text-emerald-400",
      settled: false,
    };

  return {
    id: "closed",
    label: p.windowEnd ? `Closed ${fmtShort(p.windowEnd)}` : "Window closed",
    tone: "text-foreground/45",
    settled: true,
  };
}

/** The groups, in the order a reader cares about them. Only the open window is
 *  expanded on arrival. "Declared, not yet open" is the biggest group and the
 *  least urgent — every row in it says "wait" — and leaving it open pushed the
 *  completed-purchases table thousands of pixels down the page. "Settled"
 *  collects what there is nothing left to wait for: shut windows and
 *  cancellations. Empty groups render nothing. */
const GROUPS: {
  id: string;
  states: StateId[];
  title: string;
  blurb: string;
  collapsed?: boolean;
}[] = [
  {
    id: "open",
    states: ["open"],
    title: "Buying window open now",
    blurb: "The declared purchase can be made any day inside this window.",
  },
  {
    id: "upcoming",
    states: ["upcoming", "unstated"],
    title: "Declared, not yet open",
    blurb: "Filed and waiting out the notice period before buying can start.",
    collapsed: true,
  },
  {
    id: "settled",
    states: ["closed", "withdrawn"],
    title: "Closed and withdrawn",
    blurb:
      "Windows that have run their course, and plans the filer called off. Kept on the page because a controlling shareholder cancelling a purchase is itself news.",
    collapsed: true,
  },
];

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
   *  opens first, the settled ones newest-filed first. */
  const groups = useMemo(() => {
    const stated = plans.map((p) => ({ plan: p, w: windowState(p, today) }));

    return GROUPS.map((g) => {
      const rows = stated.filter((r) => g.states.includes(r.w.id));

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
  }, [plans, today]);

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
          {emptyLabel ?? "No declarations on file."}
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

/** The payload's explainer. The first paragraph is the one a reader needs
 *  before the list makes sense; the rest is the statute — thresholds, notice
 *  periods, the 70–130% band — which is reference material and sat between
 *  the heading and the first row as roughly 130 words of regulation. It's
 *  still here, one click away, and still worded by the server. */
function Notice({ notice }: { notice: NonNullable<PlansPayload["notice"]> }) {
  const [expanded, setExpanded] = useState(false);
  const paras = notice.body.split("\n\n").filter(Boolean);
  const [lead, ...rest] = paras;

  return (
    <div className={`mt-4 ${CARD}`}>
      <h3 className="text-[14px] font-semibold leading-[1.35] text-foreground">
        {notice.headline}
      </h3>
      {lead ? (
        <p className="mt-2 text-[13.5px] leading-[1.6] text-foreground/65">
          {lead}
        </p>
      ) : null}

      {expanded
        ? rest.map((para) => (
            <p
              key={para.slice(0, 24)}
              className="mt-2 text-[13.5px] leading-[1.6] text-foreground/65"
            >
              {para}
            </p>
          ))
        : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px]">
        {rest.length > 0 && (
          <button
            className="underline underline-offset-2 hover:opacity-70"
            type="button"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : "How the rule works"}
          </button>
        )}
        {notice.learnMorePath ? (
          <Link
            className="underline underline-offset-2 hover:opacity-70"
            to={notice.learnMorePath}
          >
            {notice.learnMoreLabel ?? "Learn more"}
          </Link>
        ) : null}
      </div>
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
  rows: { plan: MarketPlan; w: WindowState }[];
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
            {rows.map(({ plan, w }) => (
              <PlanRow
                key={plan.key}
                formatValue={formatValue}
                locale={locale}
                plan={plan}
                valueColumnClass={valueColumnClass}
                w={w}
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

/** Header for the declarations table. Deliberately not MarketRowHeader: the
 *  labels all differ (a declaration has no disclosure, no trend and no
 *  return), and its column set is driven by MarketConfig.hiddenColumns, which
 *  describes the dealings feed. The styling is copied verbatim. */
function PlanRowHeader({ valueColumnClass }: { valueColumnClass: string }) {
  return (
    <div className="hidden md:flex items-center text-[10px] uppercase tracking-wider text-muted/80 font-medium select-none border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.05]">
      <div className={`${COL.date} shrink-0 px-3 py-1.5 ${CELL}`}>
        <HeaderLabel help="The date the declaration was filed. This is the event: nothing has been bought yet.">
          Declared
        </HeaderLabel>
      </div>
      <div className={`${COL.ticker} shrink-0 px-2 py-1.5 text-center ${CELL}`}>
        <HeaderLabel help="The exchange code for the company the insider intends to buy.">
          Ticker
        </HeaderLabel>
      </div>
      <div className={`flex-1 min-w-0 px-3 py-1.5 ${CELL}`}>
        <HeaderLabel help="The company, the insider who filed, and what they are to it — the filing threshold selects for ownership, so the holder status is usually more telling than the job title.">
          Company / Insider
        </HeaderLabel>
      </div>
      <div
        className={`${valueColumnClass} shrink-0 px-3 py-1.5 text-right ${CELL}`}
      >
        <HeaderLabel help="The size of the purchase as declared, and what share of the company it would be. Intended, not spent.">
          Intends to buy
        </HeaderLabel>
      </div>
      <div className={`${COL.window} shrink-0 px-3 py-1.5 ${CELL}`}>
        <HeaderLabel help="The period the declared purchase must happen inside. Neither end of it is a trade date.">
          Window
        </HeaderLabel>
      </div>
      <div className={`${COL.action} shrink-0 px-2 py-1.5 text-center`}>
        <HeaderLabel help="What has actually been filed against the declaration so far, as a share of what was promised.">
          Filed so far
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
  w,
  formatValue,
  valueColumnClass,
  locale,
}: {
  plan: MarketPlan;
  w: WindowState;
  formatValue: (v: number) => string;
  valueColumnClass: string;
  locale: string;
}) {
  const ticker = displayTicker(p.ticker);
  // A declaration that states no won value usually still states a share
  // count. What it must never do is show an em-dash where a figure goes:
  // "not stated" is a fact about the filing, "—" is the page shrugging.
  const amount = p.plannedValue != null ? formatValue(p.plannedValue) : null;
  const amountCompact =
    p.plannedValue != null ? compactValue(p.plannedValue, formatValue) : null;
  const shares =
    p.plannedShares != null ? p.plannedShares.toLocaleString("en-GB") : null;
  // "15,000 shares" wraps to two lines in a column sized for a currency
  // figure. The unit drops to the secondary line instead, where the ≈£
  // reading sits when there is a won value — same slot, same job.
  const valueLabel = amount ?? shares ?? "Not stated";
  const valueLabelCompact = amountCompact ?? shares ?? "Not stated";
  const valueUnit = amount == null && shares != null ? "shares" : null;
  const valueSecondary = p.plannedValueSecondary ?? valueUnit;
  const valueStated = amount != null || shares != null;
  const stake =
    p.plannedPercent != null ? `${p.plannedPercent}% of company` : null;

  // The insider line, in the dealings row's secondary slot. The filer's own
  // Korean wording for the purpose stays in the title attribute: it is the
  // record, not the reading, and a reader who cannot parse it gains nothing
  // from it sitting in the row.
  const insiderLine = [p.insiderName, p.holderStatus, p.purposeLabel]
    .filter(Boolean)
    .join(" · ");
  const insiderTitle =
    [insiderLine, p.purposeHint, p.purposeRaw].filter(Boolean).join(" — ") ||
    undefined;

  const range =
    p.windowStart && p.windowEnd
      ? `${fmtShort(p.windowStart)} – ${fmtShort(p.windowEnd)}`
      : p.windowStart
        ? `From ${fmtShort(p.windowStart)}`
        : null;

  const executedPct =
    p.plannedValue && p.executedValue
      ? Math.min(100, Math.round((p.executedValue / p.plannedValue) * 100))
      : null;
  const executed =
    p.executedValue != null && p.executedValue > 0
      ? formatValue(p.executedValue)
      : null;

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
          MarketRow's one-liner: logo · company · what they intend to spend.
          The state sits under the name because on a declaration it is the
          whole point — a phone reader needs to know whether this can happen
          today. Everything else (filer, notice period, follow-through) is
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
          <div className={`mt-0.5 truncate text-[11px] ${w.tone}`}>
            {w.label}
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
            {valueLabelCompact}
          </span>
          {valueSecondary ? (
            <span className="block text-[10px] tabular-nums text-muted/75">
              {valueSecondary}
            </span>
          ) : null}
        </span>
      </div>

      {/* ── Desktop (md+) ── */}
      <div className="hidden md:flex items-stretch">
        <div
          className={`${COL.date} shrink-0 px-3 py-2.5 flex flex-col justify-center ${CELL}`}
        >
          <div className="text-xs text-foreground/90 font-medium leading-tight">
            {shortDate(fmtIso(p.filedDate), locale)}
          </div>
          {/* Forewarning only reads as forewarning when there is some. A
              withdrawal and a late-filed window both produce a negative
              count, which rendered as "-26 days' notice". */}
          {p.noticeDays != null && p.noticeDays > 0 ? (
            <div className="text-[10px] text-muted/75 mt-0.5">
              {p.noticeDays === 1 ? "1 day’s" : `${p.noticeDays} days’`} notice
            </div>
          ) : null}
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
            {/* Venue leads the line, as it does on the dealings rows below:
                a chip parked at the end of a truncating sentence is the
                first thing to disappear. */}
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              {p.venue ? (
                <span className={`${chip()} shrink-0 text-muted`}>
                  {p.venue}
                </span>
              ) : null}
              <span
                className="text-[11px] text-muted truncate"
                title={insiderTitle}
              >
                {insiderLine}
              </span>
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
            {valueLabel}
          </div>
          {valueSecondary ? (
            <div className="text-[10px] tabular-nums text-muted/75 leading-tight">
              {valueSecondary}
            </div>
          ) : null}
          {/* The reason the filing exists: a declaration is triggered by the
              size of the stake, not by the sum of money. */}
          {stake ? (
            <div className="text-[10px] tabular-nums text-muted/75 leading-tight whitespace-nowrap">
              {stake}
            </div>
          ) : null}
        </div>

        <div
          className={`${COL.window} shrink-0 px-3 py-2.5 flex flex-col justify-center ${CELL}`}
        >
          <div className={`text-[13px] font-medium leading-tight ${w.tone}`}>
            {w.label}
          </div>
          {range ? (
            <div className="text-[10px] tabular-nums text-muted/75 mt-0.5">
              {range}
            </div>
          ) : null}
        </div>

        <div
          className={`${COL.action} shrink-0 px-3 py-2.5 flex flex-col justify-center`}
        >
          {executed ? (
            <>
              <div className="text-[11px] font-medium text-foreground/85 tabular-nums">
                {executedPct != null ? `Filed ${executedPct}%` : "Filed"}
              </div>
              {executedPct != null ? (
                <div className="mt-1 h-1 w-full rounded-full bg-black/[0.08] dark:bg-white/[0.12]">
                  {/* Brand brown reads as the filled part on cream and as a
                      HOLE on the dark surface — it is darker than its own
                      track there. The tan is the same token the rest of the
                      site swaps to in dark mode. */}
                  <div
                    className="h-1 rounded-full bg-brand-brown/70 dark:bg-brand-tan/80"
                    style={{ width: `${executedPct}%` }}
                  />
                </div>
              ) : null}
              <div className="mt-1 text-[10px] tabular-nums text-muted/75 leading-tight">
                {executed}
              </div>
            </>
          ) : w.settled ? null : (
            <div className="text-[11px] text-muted/70">Nothing filed yet</div>
          )}
        </div>
      </div>
    </li>
  );
}
