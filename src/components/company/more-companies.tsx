/** "Director buying at other companies" — the onward-link rail at the foot
 *  of a company page.
 *
 *  Company pages are the site's long tail: they rank individually and each one
 *  is an entry point of its own. A visitor who arrives on one ticker and finds
 *  no route to another leaves after a single page, which is both a worse visit
 *  and a worse crawl — the internal links here are how the rest of the index
 *  gets discovered.
 *
 *  Selection used to be a single global sort, which meant every one of the
 *  several hundred company pages carried the SAME eight cards. That is the
 *  worst possible internal link graph: eight URLs collect every link on the
 *  section and the other three hundred and sixty collect none. It also reads as
 *  boilerplate to anyone who visits two pages.
 *
 *  Three strands now, deduped in order:
 *    1. the most-analysed companies — the pages with something to read;
 *    2. the alphabetical neighbours of the company being viewed — a genuinely
 *       different eight per page, and the shape of the index itself;
 *    3. two rotated by a stable hash of the current key — a deterministic
 *       spread across the rest of the index, so the tail gets linked at all.
 *
 *  Deliberately still not "similar companies": we hold no sector data, and a
 *  fabricated similarity ranking would send people somewhere arbitrary while
 *  implying it isn't.
 */
import type { CompanyIndexEntry } from "@/lib/api";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

import { CompanyLogo } from "@/components/company-logo";
import { Skeleton } from "@/components/skeleton";
import { TickerPill } from "@/components/ticker-pill";
import { api } from "@/lib/api";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";
import { moneyShort } from "@/lib/company-format";

const SHOWN = 8;
const TOP = 3;
const NEIGHBOURS = 3;

/** The bar a company clears to be published, mirroring companies.tsx,
 *  functions/companies.js and functions/sitemap.xml.js. Without it this module
 *  — mounted on every company page — was the site's largest source of internal
 *  links into the pages those three deliberately leave out, and such a card
 *  reads "1 buy", which answers "why would I look at this" with "you wouldn't".
 *  Same predicate in four places now; worth a shared home the next time one of
 *  them moves. */
const meetsContentBar = (c: CompanyIndexEntry) =>
  c.deals >= 2 || c.analysed > 0;

/** A card's value figure, or 0 when the wire omitted it (`total_value` is
 *  optional — see api.ts). Absent is not zero, and the two have to render
 *  differently. */
const valueOf = (c: CompanyIndexEntry) => c.total_value ?? 0;

/** FNV-1a, 32-bit. Any stable string→int would do; this one is four lines and
 *  spreads adjacent keys ("BP.L"/"BT.L") to unrelated offsets, which a length
 *  or char-sum hash does not. */
function hash(s: string): number {
  let h = 0x811c9dc5;

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

/** Days since an ISO date, or null when it doesn't parse. */
function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);

  if (!isFinite(t)) return null;

  return Math.floor((Date.now() - t) / 86_400_000);
}

/** "3d ago" / "2w ago" — only for buys recent enough to be worth a chip.
 *  Anything older than a month says nothing a visitor would act on, so it
 *  renders no chip rather than a greyed-out one. */
function recency(iso: string | null | undefined): {
  text: string;
  fresh: boolean;
} | null {
  const d = daysSince(iso);

  if (d == null || d < 0) return null;
  if (d <= 7) return { text: d <= 1 ? "today" : `${d}d ago`, fresh: true };
  if (d <= 30)
    return { text: `${Math.max(1, Math.round(d / 7))}w ago`, fresh: false };

  return null;
}

/** The three strands, deduped, capped at SHOWN.
 *
 *  `all` is the whole index, unfiltered — every candidate is checked against
 *  the content bar before it can be picked, but the alphabetical strand needs
 *  the full list to locate the current company, which is often itself below the
 *  bar (55% of UK issuers have exactly one dealing). Filtering before this
 *  point would lose that position and leave thin pages with no neighbour strand
 *  at all.
 *
 *  `all` arrives sorted by the index's own ordering; the neighbour strand needs
 *  alphabetical order specifically, so it sorts its own copy rather than
 *  trusting the caller. */
export function pickCompanies(
  all: CompanyIndexEntry[],
  currentKey: string,
): CompanyIndexEntry[] {
  const pool = all.filter((c) => c.key !== currentKey && meetsContentBar(c));

  if (pool.length === 0) return [];

  const picked: CompanyIndexEntry[] = [];
  const seen = new Set<string>();
  const take = (c: CompanyIndexEntry | undefined) => {
    if (!c || seen.has(c.key) || picked.length >= SHOWN) return;
    // The current company and the bar again, because the neighbour strand
    // walks the unfiltered list rather than the pool.
    if (c.key === currentKey || !meetsContentBar(c)) return;
    seen.add(c.key);
    picked.push(c);
  };

  // 1. Most analysed — the pages with a written thesis on them.
  [...pool]
    .sort(
      (a, b) =>
        b.analysed - a.analysed ||
        (b.total_value ?? 0) - (a.total_value ?? 0) ||
        b.deals - a.deals,
    )
    .slice(0, TOP)
    .forEach(take);

  // 2. Alphabetical neighbours of the current company — different on every
  //    page, and the one strand a visitor can predict.
  const alpha = [...all].sort((a, b) =>
    cleanCompanyName(a.company).localeCompare(cleanCompanyName(b.company)),
  );
  const at = alpha.findIndex((c) => c.key === currentKey);

  if (at >= 0) {
    for (
      let step = 1;
      step <= alpha.length && picked.length < TOP + NEIGHBOURS;
      step++
    ) {
      take(alpha[at - step]);
      take(alpha[at + step]);
    }
  }

  // 3. Two rotated by a stable hash of the current key, so the long tail gets
  //    linked from somewhere and the same page always links the same two.
  const seed = hash(currentKey);

  for (let i = 0; picked.length < SHOWN && i < pool.length; i++) {
    take(pool[(seed + i * 97) % pool.length]);
  }

  return picked.slice(0, SHOWN);
}

export function MoreCompanies({
  currentKey,
  market,
}: {
  /** Storage key of the company being viewed — excluded from the rail. */
  currentKey: string;
  market: string;
}) {
  const [rows, setRows] = useState<CompanyIndexEntry[] | null>(null);

  useEffect(() => {
    let live = true;

    api
      .companies(market)
      .then((all) => live && setRows(all))
      .catch(() => live && setRows([]));

    return () => {
      live = false;
    };
  }, [market]);

  const picked = useMemo(
    () => (rows ? pickCompanies(rows, currentKey) : []),
    [rows, currentKey],
  );

  const loading = rows === null;

  // Silent when there's nothing to link to — an empty "explore more" heading is
  // worse than no heading.
  if (!loading && picked.length === 0) return null;

  const subject = market === "UK" ? "Director buying" : "Insider buying";

  return (
    <section className="mt-16">
      {/* THE HEADING OUTRANKS THE CARDS.
          It ran at the 17px in-sheet section spec, which is the size for a
          heading sitting INSIDE the record's sheet with body copy under it.
          Out here it introduces eight cards whose own figures are set at
          18px+, so the label of the group was the smallest strong thing in
          the group — everything landed on one level and the eye had nowhere
          to start. Set at the page-foot scale it reads as a new chapter after
          the dark band, and the cards read as its contents. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
        <h2 className="text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[28px]">
          {subject} at other companies
        </h2>
        <Link
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-foreground/70 underline-offset-4 hover:underline"
          to="/companies"
        >
          Browse every company
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {/* Two up on mobile, not eight stacked full-width cards: this sits below
          the record AND below the app band, and a 600px column of onward links
          is a wall nobody scrolls to the end of. */}
      <ul className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {/* Card shells while the index loads. Without them a 2×4 grid of cards
            appeared below the dark band and shoved the FAQ down the page —
            the one shift on this route that lands after the reader has already
            started reading. Same chrome, same internal rhythm, so the fill is
            a fill rather than a redraw. */}
        {loading
          ? Array.from({ length: SHOWN }, (_, i) => (
              <li key={i}>
                <div className="flex h-full flex-col rounded-xl border border-hairline bg-sheet px-4 py-3.5 dark:border-white/[0.07] dark:bg-surface">
                  <span className="flex items-start gap-2.5">
                    <Skeleton circle className="shrink-0" h={30} w={30} />
                    <span className="min-w-0 flex-1">
                      <Skeleton className="h-[15px] w-full" />
                      <Skeleton className="mt-1.5 h-[15px] w-3/5" />
                    </span>
                  </span>
                  <Skeleton className="mt-3 h-[25px] w-20" />
                  <Skeleton className="mt-2 h-4 w-24" />
                </div>
              </li>
            ))
          : null}

        {picked.map((c) => {
          const when = recency(c.last_trade_date);
          // Absent `total_value` is "unknown", not "nothing": the card leads
          // with the deal count instead, prints no bar (a 2px stub next to
          // real bars reads as zero) and drops the count from the ticker line
          // rather than printing the same string twice on one card.
          const hasValue = valueOf(c) > 0;
          const buys = `${c.deals} ${c.deals === 1 ? "buy" : "buys"}`;
          // With the figure now reading as "this much was added", the line
          // beneath says what it is spread across. Without a value the count
          // IS the figure above, so it isn't repeated here.
          const secondary = hasValue
            ? `across ${buys}${c.analysed > 0 ? ` · ${c.analysed} rated` : ""}`
            : c.analysed > 0
              ? `${c.analysed} rated`
              : null;

          return (
            <li key={c.key}>
              <Link
                className="group flex h-full flex-col rounded-xl border border-hairline bg-sheet px-4 py-3.5 transition-colors hover:border-brand-brown/25 hover:bg-white dark:border-white/[0.07] dark:bg-surface dark:hover:border-white/15 dark:hover:bg-surface-secondary"
                to={companyPath(c.key)}
              >
                <span className="flex items-start gap-2.5">
                  <CompanyLogo className="shrink-0" size={30} ticker={c.key} />
                  {/* The company IS the link — set as the card's own title,
                      not as a caption over the figure. At 13.5px medium it
                      was lighter than the "across 16 buys" line's sibling
                      metadata and the name of the place you were about to go
                      read as an annotation on a number. */}
                  <span
                    className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-[1.3] tracking-[-0.012em] text-foreground"
                    title={cleanCompanyName(c.company)}
                  >
                    {cleanCompanyName(c.company)}
                  </span>
                </span>

                {/* THE FIGURE IS AN INCREASE, SO IT IS DRAWN AS ONE.
                    The bar under here was scaled to the largest card in the
                    group, which meant it encoded this card's rank among eight
                    and nothing else: a £7.5m issuer filled it and a £31k issuer
                    got a dot, on cards that are not a ranking and are not
                    presented as one. Nobody can read a quantity off it and it
                    was the second-largest object on the card.

                    What the number actually is: how much these insiders added
                    to their own holdings. So it is set larger, with a rising
                    arrow in front of it, and the count moves to the line below
                    where it says what the figure is spread across. */}
                <span className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-baseline gap-1">
                    {hasValue ? (
                      <ArrowTrendingUpIcon
                        aria-hidden
                        className="h-3.5 w-3.5 shrink-0 translate-y-[2px] text-positive"
                        strokeWidth={2.2}
                      />
                    ) : null}
                    <span className="truncate text-[21px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
                      {hasValue
                        ? moneyShort(
                            valueOf(c),
                            market === "UK" ? "GBP" : "USD",
                          )
                        : buys}
                    </span>
                  </span>
                  {when ? (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-semibold leading-none ${
                        when.fresh
                          ? "bg-positive/10 text-positive"
                          : "bg-black/[0.05] text-foreground/50 dark:bg-white/[0.07]"
                      }`}
                    >
                      {when.text}
                    </span>
                  ) : null}
                </span>

                <span className="mt-2 flex items-center gap-2 text-[11.5px] leading-4 text-foreground/45">
                  <TickerPill ticker={displayTicker(c.key)} />
                  {secondary ? (
                    <span className="truncate">{secondary}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
