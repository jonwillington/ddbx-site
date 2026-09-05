// Advance declarations — trades an insider has publicly committed to but has
// NOT yet made.
//
// This is a separate component from the dealings table on purpose. Every
// affordance the dealings row has (a price paid, a return since, a trade date)
// is wrong here, and reusing that shell would quietly assert things about the
// row that are not true. What a declaration has instead is a countdown: filed
// on a date, opening on a later one, for an amount that is intended rather
// than done.
//
// Three things shape the layout, all learned from the Korean feed:
//
//   1. GROUPED BY WINDOW STATE, not by filed date. A flat sixty-card list in
//      filing order interleaves declarations whose window opens next month
//      with ones that closed weeks ago and ones the filer has since called
//      off. Where a declaration sits against its window IS the declaration;
//      sorting by the filing date buried the only axis that matters.
//   2. THE CARD LEADS WITH A SENTENCE. It used to lead with a four-cell
//      definition list — Declared / Window / Intends to buy / Of the company
//      — which made the reader assemble the fact themselves, sixty times.
//      The grid is still there underneath for the exact figures.
//   3. THE FOLLOW-THROUGH IS THE PAYOFF. A declaration with executed filings
//      against it can show what actually happened, and about a quarter of
//      them can. That was fetched and adapted and then never rendered.
//
// The notice is rendered from the payload rather than written here, so the
// wording travels with the data and one market cannot drift from another. Only
// its first paragraph is shown up front — the full text is three paragraphs of
// statute, which is reference material, not an introduction.

import type { MarketPlan, PlansPayload } from "@/lib/markets/types";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { chip } from "@/components/chip";

const RULE = "border-hairline dark:border-separator";
const CARD = `rounded-xl border ${RULE} bg-sheet px-4 py-3.5 dark:bg-surface`;

/* ─── Window state ───────────────────────────────────────────────────── */

type StateId = "open" | "upcoming" | "closed" | "withdrawn" | "unstated";

interface WindowState {
  id: StateId;
  /** Short label for the card's own status line. */
  label: string;
  tone: string;
}

function windowState(p: MarketPlan, today: string): WindowState {
  if (p.isWithdrawn)
    return {
      id: "withdrawn",
      label: "Withdrawn",
      tone: "text-foreground/45",
    };
  if (!p.windowStart)
    return {
      id: "unstated",
      label: "Window not stated",
      tone: "text-foreground/45",
    };
  if (today < p.windowStart) {
    const days = daysBetween(today, p.windowStart);

    return {
      id: "upcoming",
      label:
        days === 0
          ? "Opens today"
          : `Opens in ${days} day${days === 1 ? "" : "s"}`,
      tone: "text-foreground",
    };
  }
  if (p.windowEnd && today <= p.windowEnd)
    return {
      id: "open",
      label: "Window open now",
      tone: "text-emerald-600 dark:text-emerald-400",
    };

  return {
    id: "closed",
    label: "Window closed",
    tone: "text-foreground/45",
  };
}

/** The groups, in the order a reader cares about them. "Settled" collects the
 *  declarations there is nothing left to wait for — closed windows and
 *  cancellations — and starts collapsed, because it is the record rather than
 *  the news. Empty groups render nothing. */
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

function fmtDate(d: string | null): string {
  if (!d) return "—";

  return new Date(fmtIso(d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Day + month only — the year is noise inside a window that is at most a
 *  month long and always within the next few. */
function fmtShort(d: string | null): string {
  if (!d) return "—";

  return new Date(fmtIso(d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/* ─── Section ────────────────────────────────────────────────────────── */

export function MarketPlans({
  title,
  subtitle,
  emptyLabel,
  fetchPlans,
  formatValue,
}: {
  title: string;
  subtitle?: string;
  emptyLabel?: string;
  fetchPlans: () => Promise<PlansPayload>;
  /** Market-owned money formatter, so KRW renders as KRW. */
  formatValue: (v: number) => string;
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
          rows={g.rows}
          title={g.title}
        />
      ))}
    </section>
  );
}

/** The payload's explainer. The first paragraph is the one a reader needs
 *  before the list makes sense; the rest is the statute — thresholds, notice
 *  periods, the 70–130% band — which is reference material and sat between
 *  the heading and the first card as roughly 130 words of regulation. It's
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
}: {
  title: string;
  blurb: string;
  count: number;
  rows: { plan: MarketPlan; w: WindowState }[];
  collapsed?: boolean;
  formatValue: (v: number) => string;
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
        <ul className="mt-3 space-y-2">
          {rows.map(({ plan, w }) => (
            <PlanCard
              key={plan.key}
              formatValue={formatValue}
              plan={plan}
              w={w}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PlanCard({
  plan: p,
  w,
  formatValue,
}: {
  plan: MarketPlan;
  w: WindowState;
  formatValue: (v: number) => string;
}) {
  const amount = p.plannedValue != null ? formatValue(p.plannedValue) : null;
  // A declaration that states no won value usually still states a share
  // count. "intends to buy shares" is a sentence that has given up; "intends
  // to buy 500,000 shares" is the filing.
  const quantity =
    amount ??
    (p.plannedShares != null
      ? `${p.plannedShares.toLocaleString("en-GB")} shares`
      : null);
  const stake = p.plannedPercent != null ? `${p.plannedPercent}%` : null;
  // "about 0.008%" is a hedge in front of a figure filed to three decimals.
  // Only round numbers get hedged.
  const stakePhrase =
    stake == null
      ? ""
      : p.plannedPercent != null && p.plannedPercent < 0.1
        ? `, ${stake} of the company`
        : `, about ${stake} of the company`;
  // Nothing is still intended once the window has shut or the filer has
  // pulled out. Past tense for both, or the card contradicts its own status
  // line: "intends to buy … The window ran to 4 Aug."
  const settled = p.isWithdrawn || w.id === "closed";
  // What has been filed against the plan so far. Never a signal and never
  // ranked on — just the answer to the question the card provokes.
  const executed =
    p.executedValue != null && p.executedValue > 0
      ? formatValue(p.executedValue)
      : null;
  const executedPct =
    p.plannedValue && p.executedValue
      ? Math.min(100, Math.round((p.executedValue / p.plannedValue) * 100))
      : null;

  return (
    <li className={`${CARD} ${p.isWithdrawn ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-baseline gap-2 min-w-0">
          <span
            className={`text-[15px] font-semibold tracking-[-0.01em] text-foreground ${
              p.isWithdrawn ? "line-through decoration-foreground/30" : ""
            }`}
          >
            {p.company}
          </span>
          {p.venue ? (
            <span className={`${chip()} shrink-0 text-muted`}>{p.venue}</span>
          ) : null}
        </span>
        <span className={`text-[13px] font-medium ${w.tone}`}>{w.label}</span>
      </div>

      {/* The declaration as one sentence. Every figure in it is repeated
          exactly in the grid below — this is the reading, that is the
          record. */}
      <p className="mt-1.5 text-[13.5px] leading-[1.55] text-foreground/75">
        <span className="font-medium text-foreground">{p.insiderName}</span>
        {p.holderStatus ? (
          <span className="text-foreground/55"> ({p.holderStatus})</span>
        ) : null}
        {settled ? " declared an intention to buy" : " intends to buy"}
        {quantity ? (
          <span className="font-medium"> {quantity}</span>
        ) : (
          " shares"
        )}
        {stakePhrase}
        {p.windowStart
          ? p.isWithdrawn
            ? `, in a window from ${fmtShort(p.windowStart)}, and has since withdrawn it.`
            : w.id === "open"
              ? `, and can do so until ${fmtShort(p.windowEnd)}.`
              : w.id === "closed"
                ? `. The window ran to ${fmtShort(p.windowEnd)}.`
                : `, from ${fmtShort(p.windowStart)}.`
          : "."}
      </p>

      {executed ? (
        <div className="mt-2.5 rounded-lg border border-hairline bg-black/[0.02] px-3 py-2 dark:border-separator dark:bg-white/[0.03]">
          <p className="text-[13px] leading-[1.5] text-foreground/75">
            <span className="font-medium text-foreground">
              Filed so far: {executed}
            </span>
            {executedPct != null ? (
              <span className="text-foreground/55">
                {" "}
                — {executedPct}% of what was declared.
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-4">
        <Field label="Declared" value={fmtDate(p.filedDate)} />
        <Field
          label="Window"
          value={
            p.windowStart
              ? `${fmtDate(p.windowStart)} – ${fmtDate(p.windowEnd)}`
              : "—"
          }
        />
        <Field
          label="Intends to buy"
          sub={p.plannedValueSecondary ?? undefined}
          value={amount ?? "—"}
        />
        <Field label="Of the company" value={stake ?? "—"} />
      </dl>

      {p.purposeLabel ? (
        <p
          className="mt-3 text-[13px] leading-[1.5] text-foreground/60"
          title={p.purposeHint ?? undefined}
        >
          <span className="font-medium text-foreground/75">
            {p.purposeLabel}
          </span>
          {p.purposeRaw ? (
            <span className="opacity-60"> · {p.purposeRaw}</span>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}

function Field({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <dt className="text-[11.5px] uppercase tracking-[0.04em] text-foreground/45">
        {label}
      </dt>
      <dd className="mt-0.5 text-foreground/85">
        {value}
        {sub ? (
          <span className="block text-[11.5px] tabular-nums text-foreground/50">
            {sub}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
