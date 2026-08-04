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
// The notice is rendered from the payload rather than written here, so the
// wording travels with the data and one market cannot drift from another.

import type { MarketPlan, PlansPayload } from "@/lib/markets/types";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const RULE = "border-hairline dark:border-separator";

/** "in 12 days" / "open now" / "closed". A declaration's whole shape is where
 *  it sits relative to its window, so that is what leads the row. */
function windowState(p: MarketPlan, today: string): { label: string; tone: string } {
  if (p.isWithdrawn) return { label: "Withdrawn", tone: "text-foreground/45 line-through" };
  if (!p.windowStart) return { label: "Window not stated", tone: "text-foreground/45" };
  if (today < p.windowStart) {
    const days = daysBetween(today, p.windowStart);
    return {
      label: days === 0 ? "Opens today" : `Opens in ${days} day${days === 1 ? "" : "s"}`,
      tone: "text-foreground",
    };
  }
  if (p.windowEnd && today <= p.windowEnd) {
    return { label: "Window open now", tone: "text-emerald-600 dark:text-emerald-400" };
  }
  return { label: "Window closed", tone: "text-foreground/45" };
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(fmtIso(b)) - Date.parse(fmtIso(a));
  return Math.max(0, Math.round(ms / 86400000));
}

/** Accepts YYYYMMDD (as filed) or YYYY-MM-DD. */
function fmtIso(d: string): string {
  return /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : d;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(fmtIso(d)).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

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
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [fetchPlans]);

  // A market whose declarations fail to load should lose the section, not the
  // page — the dealings feed below is independent and still worth reading.
  if (failed) return null;

  const today = new Date().toISOString().slice(0, 10);
  const plans = data?.plans ?? [];

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

      {data?.notice ? (
        <div className={`mt-4 rounded-xl border ${RULE} bg-sheet px-4 py-3.5 dark:bg-surface`}>
          <h3 className="text-[14px] font-semibold leading-[1.35] text-foreground">
            {data.notice.headline}
          </h3>
          {data.notice.body.split("\n\n").map((para) => (
            <p key={para.slice(0, 24)} className="mt-2 text-[13.5px] leading-[1.6] text-foreground/65">
              {para}
            </p>
          ))}
          {data.notice.learnMorePath ? (
            <Link
              className="mt-3 inline-block text-[13.5px] underline underline-offset-2 hover:opacity-70"
              to={data.notice.learnMorePath}
            >
              {data.notice.learnMoreLabel ?? "Learn more"}
            </Link>
          ) : null}
        </div>
      ) : null}

      {data && plans.length === 0 ? (
        <p className="mt-4 text-[13.5px] text-foreground/55">
          {emptyLabel ?? "No declarations on file."}
        </p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {plans.map((p) => {
          const w = windowState(p, today);
          return (
            <li key={p.key} className={`rounded-xl border ${RULE} bg-sheet px-4 py-3.5 dark:bg-surface`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                  {p.company}
                </span>
                <span className={`text-[13px] font-medium ${w.tone}`}>{w.label}</span>
              </div>

              <p className="mt-1 text-[13.5px] leading-[1.55] text-foreground/70">
                {p.insiderName}
                {p.holderStatus ? ` · ${p.holderStatus}` : ""}
              </p>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-4">
                <Field label="Declared" value={fmtDate(p.filedDate)} />
                <Field
                  label="Window"
                  value={p.windowStart ? `${fmtDate(p.windowStart)} – ${fmtDate(p.windowEnd)}` : "—"}
                />
                <Field
                  label="Intends to buy"
                  value={p.plannedValue != null ? formatValue(p.plannedValue) : "—"}
                />
                <Field
                  label="Of the company"
                  value={p.plannedPercent != null ? `${p.plannedPercent}%` : "—"}
                />
              </dl>

              {p.purposeLabel ? (
                <p className="mt-3 text-[13px] leading-[1.5] text-foreground/60" title={p.purposeHint ?? undefined}>
                  <span className="font-medium text-foreground/75">{p.purposeLabel}</span>
                  {p.purposeRaw ? <span className="opacity-60"> · {p.purposeRaw}</span> : null}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11.5px] uppercase tracking-[0.04em] text-foreground/45">{label}</dt>
      <dd className="mt-0.5 text-foreground/85">{value}</dd>
    </div>
  );
}
