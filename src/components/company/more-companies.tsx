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
import { ArrowRightIcon } from "@heroicons/react/24/outline";

import { CompanyLogo } from "@/components/company-logo";
import { MeterBar } from "@/components/seo/meter-bar";
import { TickerPill } from "@/components/ticker-pill";
import { api } from "@/lib/api";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";
import { moneyShort } from "@/lib/company-format";

const SHOWN = 8;
const TOP = 3;
const NEIGHBOURS = 3;

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
 *  `all` arrives sorted by the index's own ordering; the neighbour strand needs
 *  alphabetical order specifically, so it sorts its own copy rather than
 *  trusting the caller. */
export function pickCompanies(
  all: CompanyIndexEntry[],
  currentKey: string,
): CompanyIndexEntry[] {
  const pool = all.filter((c) => c.key !== currentKey);

  if (pool.length === 0) return [];

  const picked: CompanyIndexEntry[] = [];
  const seen = new Set<string>();
  const take = (c: CompanyIndexEntry | undefined) => {
    if (!c || seen.has(c.key) || picked.length >= SHOWN) return;
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

  // Silent when there's nothing to link to — an empty "explore more" heading is
  // worse than no heading.
  if (picked.length === 0) return null;

  const subject = market === "UK" ? "Director buying" : "Insider buying";
  // Bars are relative to the largest card in this group, not to the index —
  // scaling eight mid-cap companies against the market's biggest buy would
  // draw eight empty bars.
  const top = Math.max(...picked.map((c) => c.total_value ?? 0));

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground">
          {subject} at other companies
        </h2>
        <Link
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground/70 underline-offset-4 hover:underline"
          to="/companies"
        >
          Browse every company
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Two up on mobile, not eight stacked full-width cards: this sits below
          the record AND below the app band, and a 600px column of onward links
          is a wall nobody scrolls to the end of. */}
      <ul className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {picked.map((c) => {
          const when = recency(c.last_trade_date);

          return (
            <li key={c.key}>
              <Link
                className="group flex h-full flex-col rounded-xl border border-hairline bg-sheet px-3.5 py-3 transition-colors hover:border-brand-brown/25 hover:bg-white dark:border-white/[0.07] dark:bg-surface dark:hover:border-white/15 dark:hover:bg-surface-secondary"
                to={companyPath(c.key)}
              >
                <span className="flex items-start gap-2.5">
                  <CompanyLogo className="shrink-0" size={28} ticker={c.key} />
                  <span
                    className="line-clamp-2 min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-foreground"
                    title={cleanCompanyName(c.company)}
                  >
                    {cleanCompanyName(c.company)}
                  </span>
                </span>

                <span className="mt-2.5 flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold tabular-nums tracking-[-0.01em] text-foreground">
                    {c.total_value
                      ? moneyShort(
                          c.total_value,
                          market === "UK" ? "GBP" : "USD",
                        )
                      : `${c.deals} ${c.deals === 1 ? "buy" : "buys"}`}
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

                {top > 0 && (
                  <MeterBar
                    className="mt-2"
                    max={top}
                    value={c.total_value ?? 0}
                  />
                )}

                <span className="mt-2 flex items-center gap-2 text-[11.5px] leading-4 text-foreground/50">
                  <TickerPill ticker={displayTicker(c.key)} />
                  <span className="truncate">
                    {c.analysed > 0
                      ? `${c.analysed} rated`
                      : `${c.deals} ${c.deals === 1 ? "buy" : "buys"}`}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
