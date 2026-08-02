/** The cluster, shown rather than asserted.
 *
 *  `cluster.count` says "2 insiders bought inside a 14-day window" and the
 *  first version printed exactly that, as a sentence, in a card. It is the most
 *  interesting fact on a filing page — breadth is the one signal a single
 *  purchase cannot give you — and it was the least visual thing on the page.
 *
 *  So this fetches the issuer's other filings and draws the cluster: every
 *  purchase in the window on a shared date axis, with this one marked, and the
 *  people underneath ranked by what they put in. That turns "a strong cluster"
 *  from a label into something a reader can count for themselves.
 *
 *  Degrades to nothing. The company bundle is a second request for supporting
 *  evidence, so a failure leaves the page standing on the rest of its content
 *  rather than showing an empty frame — the caller renders the cluster's
 *  one-line summary either way, which is also what the pre-render emits.
 */
import type { Dealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { cleanName, filingPath, money } from "../../../shared/filings.js";

import { CalendarDayChip, chipParts } from "@/components/calendar-day-chip";
import { api } from "@/lib/api";

const RULE = "border-hairline dark:border-separator";

/** Days either side of this trade to treat as "the window".
 *  `cluster.window_days` is the detector's own span, so it is used directly
 *  rather than a constant of this component's invention. */
function inWindow(iso: string, anchor: string, days: number) {
  const a = Date.parse(`${anchor}T00:00:00Z`);
  const b = Date.parse(`${iso}T00:00:00Z`);

  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;

  return Math.abs(b - a) <= days * 86_400_000;
}

const monthAbbr = (iso: string) =>
  new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).toLocaleDateString(
    "en-GB",
    {
      month: "short",
      timeZone: "UTC",
    },
  );

interface Peer {
  id: string;
  name: string;
  role: string;
  date: string;
  value: number;
  isThis: boolean;
}

export function ClusterPanel({
  deal,
  fallback,
  market = "UK",
}: {
  deal: Dealing;
  /** Rendered instead of the drawing when the co-buyers cannot be loaded, so
   *  the section is never empty and the cluster is always stated exactly once
   *  somewhere on the page. */
  fallback: string;
  market?: string;
}) {
  // Typed as UK rows: this panel only renders on /dealings/:id, which is a UK
  // pipeline route (see functions/dealings/[id].js). A US filing page would
  // need the reporter shape too, and gets it when that route lands.
  const [deals, setDeals] = useState<Dealing[] | null>(null);

  const windowDays = deal.cluster?.window_days ?? 14;

  useEffect(() => {
    let live = true;

    api
      .companyPage(market, deal.ticker)
      .then((r) => live && setDeals(r.deals as Dealing[]))
      .catch(() => live && setDeals([]));

    return () => {
      live = false;
    };
  }, [market, deal.ticker]);

  const peers = useMemo<Peer[]>(() => {
    if (!deals) return [];

    return deals
      .filter((d) => inWindow(d.trade_date, deal.trade_date, windowDays))
      .map((d) => ({
        id: d.id,
        name: d.director?.name ?? "Insider",
        role: d.director?.role ?? "",
        date: d.trade_date,
        value: Number(d.value_gbp ?? 0),
        isThis: d.id === deal.id,
      }))
      .sort((a, b) => b.value - a.value);
  }, [deals, deal.id, deal.trade_date, windowDays]);

  if (!deals || peers.length < 2) {
    return (
      <p className="mt-5 max-w-[62ch] text-[14px] leading-[1.65] text-foreground/70">
        {fallback}
      </p>
    );
  }

  const dates = peers.map((p) => Date.parse(`${p.date}T00:00:00Z`));
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const top = Math.max(...peers.map((p) => p.value), 1);
  const total = peers.reduce((n, p) => n + p.value, 0);

  // A day per column across the whole window, not two labelled endpoints.
  // The claim being made is about TIMING, and a bare line with a dot at each
  // end told a reader nothing about the shape of it: whether five purchases
  // landed on one afternoon or trickled over three weeks, and whether the gaps
  // are weekends or actual silence. Every calendar day is drawn, weekends are
  // marked as non-trading, and the days with a purchase carry the site's
  // calendar chip.
  const days: {
    iso: string;
    weekday: string;
    dayNum: string;
    weekend: boolean;
    monthStart: boolean;
    buys: Peer[];
  }[] = [];

  for (let t = min; t <= max; t += 86_400_000) {
    const d = new Date(t);
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();

    days.push({
      iso,
      ...chipParts(iso),
      weekend: dow === 0 || dow === 6,
      monthStart: days.length === 0 || d.getUTCDate() === 1,
      buys: peers.filter((p) => p.date === iso),
    });
  }

  const monthSpan = [
    ...new Set(
      days.map((d) =>
        new Date(`${d.iso}T00:00:00Z`).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }),
      ),
    ),
  ].join(" to ");

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
          {monthSpan}
        </p>
        <p className="text-[12px] text-foreground/45">
          {days.length} days, {peers.length} purchases
        </p>
      </div>

      {/* Horizontal scroll rather than squeezing: a 30-day cluster at the
          document measure would give each day 28px, which is narrower than the
          chip and unreadable. The strip scrolls; the list below is complete
          either way. */}
      <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-1">
        <div className="flex min-w-full gap-1">
          {days.map((d) => {
            const has = d.buys.length > 0;
            const isThis = d.buys.some((b) => b.isThis);

            return (
              <div
                key={d.iso}
                className={`flex min-w-[34px] flex-1 flex-col items-center gap-1.5 rounded-lg py-2 ${
                  d.weekend ? "bg-foreground/[0.03]" : ""
                }`}
                title={
                  has
                    ? d.buys
                        .map(
                          (b) => `${b.name}, ${money(b.value, deal.currency)}`,
                        )
                        .join("\n")
                    : undefined
                }
              >
                {/* Plain type, not a calendar chip.
                    The chips are the LIST's device below; repeating them here
                    put five boxed dates immediately above five more, so the
                    strip stopped reading as a continuous run of days and
                    started reading as a second, competing list. A purchase day
                    is marked by weight and colour on the number instead, which
                    is all the strip needs to say. */}
                <span className="flex h-9 flex-col items-center justify-center">
                  <span
                    className={`text-[8.5px] font-semibold uppercase tracking-[0.1em] ${
                      has ? "text-foreground/45" : "text-foreground/25"
                    }`}
                  >
                    {d.weekday.slice(0, has ? 3 : 1)}
                  </span>
                  <span
                    className={`mt-0.5 tabular-nums ${
                      isThis
                        ? "text-[17px] font-semibold text-brand-brown dark:text-brand-tan"
                        : has
                          ? "text-[15px] font-semibold text-foreground/80"
                          : "text-[12px] text-foreground/30"
                    }`}
                  >
                    {d.dayNum}
                  </span>
                </span>
                {/* The month, on its first day in the window (and on the very
                    first cell, which may not be a 1st). Without it the run
                    reads 29, 30, 1, 2 with no indication that it turned over. */}
                <span className="h-3 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-brand-brown dark:text-brand-tan">
                  {d.monthStart ? monthAbbr(d.iso) : ""}
                </span>

                {/* One stem per purchase that day, so two filings on one date
                    are visible as two. */}
                <span className="flex h-4 items-end gap-0.5">
                  {d.buys.map((b) => (
                    <span
                      key={b.id}
                      className={`w-1 rounded-full ${
                        b.isThis
                          ? "h-4 bg-brand-brown dark:bg-brand-tan"
                          : "h-2.5 bg-foreground/25"
                      }`}
                    />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ul className={`mt-4 border-t ${RULE}`}>
        {peers.map((p) => (
          <li
            key={p.id}
            className={`flex items-center gap-3 border-b ${RULE} py-3`}
          >
            {/* Chip plus month. The chip carries a weekday and a day number,
                which is a complete date only inside a known month — and a
                cluster window routinely straddles two, so a column reading
                29, 3, 17, 6, 1 was unreadable without one. Mirrors
                MarketDayHeader, which pairs the same chip with a month label
                for the same reason. */}
            <span className="flex shrink-0 flex-col items-center gap-1">
              <CalendarDayChip
                {...chipParts(p.date)}
                muted={!p.isThis}
                size="sm"
              />
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground/40">
                {monthAbbr(p.date)}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              {p.isThis ? (
                <span className="text-[13.5px] font-semibold text-foreground">
                  {p.name}
                  <span className="ml-2 rounded bg-brand-brown/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-brown dark:bg-brand-tan/15 dark:text-brand-tan">
                    This buy
                  </span>
                </span>
              ) : (
                <Link
                  className="text-[13.5px] text-foreground/85 underline-offset-4 hover:underline"
                  to={filingPath(p.id)}
                >
                  {p.name}
                </Link>
              )}
              <span className="mt-0.5 block text-[12px] text-foreground/45">
                {p.role || "Insider"}
              </span>
            </span>
            <span className="w-20 shrink-0 sm:w-32">
              <span
                aria-hidden
                className={`block h-[4px] rounded-full ${
                  p.isThis
                    ? "bg-brand-brown/70 dark:bg-brand-tan/70"
                    : "bg-foreground/15"
                }`}
                style={{ width: `${Math.max(6, (p.value / top) * 100)}%` }}
              />
            </span>
            <span className="w-16 shrink-0 text-right text-[13px] tabular-nums text-foreground/70">
              {money(p.value, deal.currency)}
            </span>
          </li>
        ))}
      </ul>

      {/* Deliberately states purchases and value, NOT a headcount.
          `cluster.count` is the detector's own figure and the only authoritative
          one; counting distinct names in this list produced a different number
          (it picked up a person-closely-associated filing the detector does
          not treat as a separate member) and printed it three lines from the
          detector's, disagreeing. One idea, one source. */}
      <p className="mt-3 text-[13px] leading-[1.6] text-foreground/55">
        {money(total, deal.currency)} across {peers.length}{" "}
        {peers.length === 1 ? "disclosed purchase" : "disclosed purchases"} at{" "}
        {cleanName(deal.company)} inside {windowDays} days.
      </p>
    </div>
  );
}
