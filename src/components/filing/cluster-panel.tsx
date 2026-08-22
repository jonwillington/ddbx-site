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
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, CheckIcon } from "@heroicons/react/20/solid";

import { cleanName } from "../../../shared/filings.js";
import { filingFamily } from "../../../shared/filing-family.js";

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
  deal: Dealing | UsDealing;
  /** Rendered instead of the drawing when the co-buyers cannot be loaded, so
   *  the section is never empty and the cluster is always stated exactly once
   *  somewhere on the page. */
  fallback: string;
  market?: string;
}) {
  // Both markets now. `market` picks the formatter family AND the company
  // bundle, so the peer rows read `reporter`/`value` on a US row and
  // `director`/`value_gbp` on a UK one without this component knowing which.
  const fam = filingFamily(market);
  const [deals, setDeals] = useState<Array<Dealing | UsDealing> | null>(null);

  const windowDays = deal.cluster?.window_days ?? 14;

  useEffect(() => {
    let live = true;

    api
      .companyPage(market, deal.ticker)
      .then((r) => live && setDeals(r.deals))
      .catch(() => live && setDeals([]));

    return () => {
      live = false;
    };
  }, [market, deal.ticker]);

  const peers = useMemo<Peer[]>(() => {
    if (!deals) return [];

    return deals
      .filter((d) => inWindow(d.trade_date, deal.trade_date, windowDays))
      .map((d) => {
        const who = fam.insider(d);

        return {
          id: d.id,
          name: who.name || "Insider",
          role: who.role ?? "",
          date: d.trade_date,
          value: Number(fam.value(d) ?? 0),
          isThis: d.id === deal.id,
        };
      })
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
                        .map((b) => `${b.name}, ${fam.money(b.value)}`)
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

                {/* A TICK PER PURCHASE, NOT A TALLY STEM.
                    These were 1px-wide stems of two different heights, which
                    at strip scale is a smudge: nothing about them said "a
                    purchase landed here" rather than "this column has some
                    quantity in it", and the days with no buy looked the same as
                    the days with one until you counted pixels. A tick is the
                    one mark that reads as an event at 14px. This filing's own
                    is knocked out of a filled disc so it stays the anchor. */}
                <span className="flex h-5 items-center justify-center gap-0.5">
                  {d.buys.map((b) =>
                    b.isThis ? (
                      <span
                        key={b.id}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-brown text-white dark:bg-brand-tan dark:text-[#1a140d]"
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <CheckIcon
                        key={b.id}
                        className="h-4 w-4 text-brand-brown/55 dark:text-brand-tan/60"
                      />
                    ),
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* WHAT EACH PERSON PUT IN IS THE ROW'S HEADLINE, AND EVERY ROW IS A DOOR.
       *
       *  Two things were wrong here. The value was 13px grey at the end of the
       *  row, quieter than the name beside it, on a panel whose entire argument
       *  is how much money went in — and the bar in front of it was drawn
       *  against the largest peer, so the top row was always full and the
       *  bottom always a stub, which is a restatement of the sort order rather
       *  than a fact about any purchase. The figure is now the largest thing on
       *  the row and the bar is gone.
       *
       *  And every one of these peers has a filing page of its own, which the
       *  row reached only through an underline on the name. The whole row is
       *  the link now, with the arrow saying so. */}
      <ul className={`mt-4 border-t ${RULE}`}>
        {peers.map((p) => {
          const body = (
            <>
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
                <span
                  className={`block text-[14px] ${
                    p.isThis
                      ? "font-semibold text-foreground"
                      : "text-foreground/85"
                  }`}
                >
                  {p.name}
                  {p.isThis ? (
                    <span className="ml-2 rounded bg-brand-brown/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-brown dark:bg-brand-tan/15 dark:text-brand-tan">
                      This buy
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[12px] text-foreground/45">
                  {p.role || "Insider"}
                </span>
              </span>

              <span
                className={`shrink-0 text-right text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] sm:text-[22px] ${
                  p.isThis ? "text-foreground" : "text-foreground/80"
                }`}
              >
                {fam.money(p.value)}
              </span>

              {/* A fixed slot either way, so the figures stay in one column
                  whether or not the row is a link. */}
              <span className="flex w-4 shrink-0 justify-end">
                {p.isThis ? null : (
                  <ArrowRightIcon
                    aria-hidden
                    className="h-4 w-4 text-foreground/25 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground/60"
                  />
                )}
              </span>
            </>
          );

          return (
            <li key={p.id} className={`border-b ${RULE}`}>
              {p.isThis ? (
                <div className="flex items-center gap-3 py-3">{body}</div>
              ) : (
                <Link
                  className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-brand-brown/40"
                  to={fam.path(p.id)}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {/* Deliberately states purchases and value, NOT a headcount.
          `cluster.count` is the detector's own figure and the only authoritative
          one; counting distinct names in this list produced a different number
          (it picked up a person-closely-associated filing the detector does
          not treat as a separate member) and printed it three lines from the
          detector's, disagreeing. One idea, one source. */}
      {/* "inside {windowDays} days" was wrong, and visibly so: `inWindow`
          collects purchases up to `windowDays` EITHER SIDE of this trade, so
          the drawn set spans up to twice the detector's window and the strip
          above it was printing "19 days" three lines from a sentence claiming
          14. The span is stated as what it is. The detector's own headline
          figure still lives in the section aside, which is the one place it is
          authoritative. */}
      <p className="mt-3 text-[13px] leading-[1.6] text-foreground/55">
        {fam.money(total)} across {peers.length}{" "}
        {peers.length === 1 ? "disclosed purchase" : "disclosed purchases"} at{" "}
        {cleanName(deal.company)}, within {windowDays} days either side of this
        one.
      </p>
    </div>
  );
}
