import type { MonthlyFeaturedItem } from "@/types/ddbx";
import type { ReactNode } from "react";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import { MonthlyPriceChart } from "./monthly-price-chart";
import { Prose } from "./monthly-prose";
import { featureBadge, returnTextClass, sentimentOrder } from "./monthly-utils";

import { chip } from "@/components/chip";
import { formatSignedPct } from "@/lib/performance/format";
import { CompanyLogo } from "@/components/company-logo";
import { BOARD_ROW_GRID } from "@/components/boards/board-row";
import { TickerPill } from "@/components/ticker-pill";
import { cleanCompanyName, displayTicker } from "@/lib/company";

const RULE = "border-hairline dark:border-separator";

/** The curated standout buys, sorted positive → neutral → negative. Each card
 *  expands in place to reveal the price arc, a price chart and the per-item
 *  retrospective / forward narrative.
 *
 *  Two variants, one accordion. "modal" is the recap's original stack of
 *  rounded tinted cards, unchanged. "page" is the archived report at
 *  /reports/:month, where the trigger is a ruled full-width row on the boards'
 *  own column spec — an ordinal, the logo, the company, the disclosure and the
 *  return in aligned tabular tracks — because on a page this list sits between
 *  a ruled sector table and a ruled cluster roster, and a stack of floating
 *  cards in the middle of that run is a third geometry for no reason. The
 *  expanded body is identical in both. */
export function MonthlyFeatured({
  items,
  heading = true,
  openFirst = false,
  variant = "modal",
}: {
  items: MonthlyFeaturedItem[];
  /** Off when the caller already sets a section heading above this block. */
  heading?: boolean;
  /** Expand the first card on mount. The archived report page sets this: the
   *  richest prose we publish is inside these cards, and while they're all
   *  collapsed none of it is in the document at all. */
  openFirst?: boolean;
  variant?: "modal" | "page";
}) {
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => sentimentOrder(a.sentiment) - sentimentOrder(b.sentiment),
      ),
    [items],
  );

  if (sorted.length === 0) return null;

  if (variant === "page") {
    return (
      <section>
        {heading ? (
          <h3 className="mb-3 text-sm font-semibold">Featured buys</h3>
        ) : null}
        <ol className={`border-t ${RULE}`}>
          {sorted.map((item, i) => (
            <FeaturedCard
              key={item.dealing_id}
              defaultOpen={openFirst && i === 0}
              item={item}
              position={i + 1}
              variant="page"
            />
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {heading ? (
        <h3 className="text-sm font-semibold">Featured buys</h3>
      ) : null}
      <div className="space-y-3">
        {sorted.map((item, i) => (
          <FeaturedCard
            key={item.dealing_id}
            defaultOpen={openFirst && i === 0}
            item={item}
          />
        ))}
      </div>
    </section>
  );
}

function FeaturedCard({
  item,
  defaultOpen = false,
  position = 0,
  variant = "modal",
}: {
  item: MonthlyFeaturedItem;
  defaultOpen?: boolean;
  /** 1-based, "page" only. */
  position?: number;
  variant?: "modal" | "page";
}) {
  const [open, setOpen] = useState(defaultOpen);
  const badge = featureBadge(item.feature_reason);
  const entryGbp =
    item.entry_price_pence != null ? item.entry_price_pence / 100 : null;

  const body = (
    <>
      <p className="text-[15px] leading-relaxed text-foreground/85">
        {item.headline_text}
      </p>

      <ArcHighlights item={item} />

      <MonthlyPriceChart
        disclosedDate={item.disclosed_date}
        entryPriceGbp={entryGbp}
        monthBars={item.chart}
        ticker={item.ticker}
      />

      {item.retrospective_text && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Has the value gone?
          </h4>
          <Prose text={item.retrospective_text} />
        </div>
      )}

      {item.forward_view_text && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Is there still a case?
          </h4>
          <Prose text={item.forward_view_text} />
        </div>
      )}

      {item.director_name && (
        <p className="text-xs text-muted">
          {item.director_name}
          {item.director_role ? ` · ${item.director_role}` : ""}
        </p>
      )}

      {item.sources && item.sources.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className="text-muted">Sources:</span>
          {item.sources.map((src, i) => (
            <a
              key={i}
              className="text-brand-brown underline-offset-2 hover:underline dark:text-brand-tan"
              href={src}
              rel="noreferrer noopener"
              target="_blank"
            >
              {hostOf(src)}
            </a>
          ))}
        </div>
      )}
    </>
  );

  if (variant === "page") {
    return (
      <FeaturedRow
        badge={badge}
        item={item}
        open={open}
        position={position}
        onToggle={() => setOpen((v) => !v)}
      >
        {body}
      </FeaturedRow>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-surface/40 dark:border-white/[0.08]">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <CompanyLogo size={44} ticker={item.ticker} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-base font-semibold">
              {item.company}
            </span>
            <span className="hidden shrink-0 text-xs text-muted sm:inline">
              {item.ticker}
            </span>
          </div>
          {/* Who bought and when. Without it two cards for the same issuer in
              one month (PANR.L was featured twice in June) are indistinguishable
              while collapsed. */}
          {(item.director_name || item.disclosed_date) && (
            <div className="mt-0.5 truncate text-xs text-muted">
              {[item.director_name, disclosedLabel(item.disclosed_date)]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
          <span className={`${chip("md")} mt-1.5 ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {item.return_since_entry != null && (
            <span
              className={`text-lg font-bold tabular-nums md:text-2xl ${returnTextClass(
                item.return_since_entry,
              )}`}
            >
              {formatSignedPct(item.return_since_entry)}
            </span>
          )}
          <ChevronDownIcon
            className={`h-5 w-5 text-muted transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-black/[0.06] px-5 py-4 dark:border-white/[0.08]">
          {body}
        </div>
      )}
    </div>
  );
}

/** The page variant's trigger: a ruled full-width row that opens in place.
 *
 *  It composes `BOARD_ROW_GRID` rather than mounting `BoardRow` itself,
 *  because that component's row IS a `<Link>` — it navigates — and this one is
 *  a disclosure that expands. The column spec is the part rule 7 asks sibling
 *  lists to share, and it is exported separately for exactly this case, so the
 *  tracks here and on every board are one definition rather than two that
 *  agree by inspection. If `BoardRow` ever takes a non-navigating trigger this
 *  collapses into it.
 *
 *  The expanded body is inset to the subject column on desktop so the prose
 *  reads as belonging to the row above it rather than restarting the page. */
function FeaturedRow({
  badge,
  children,
  item,
  open,
  position,
  onToggle,
}: {
  badge: { label: string; className: string };
  children: ReactNode;
  item: MonthlyFeaturedItem;
  open: boolean;
  position: number;
  onToggle: () => void;
}) {
  const grid = BOARD_ROW_GRID({ logo: true, perf: true });
  const ticker = displayTicker(item.ticker);
  const disclosed = disclosedLabel(item.disclosed_date);

  return (
    <li className={`border-b ${RULE}`}>
      <button
        aria-expanded={open}
        className="group relative -mx-2 block w-full rounded-lg px-2 py-3.5 text-left outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]"
        type="button"
        onClick={onToggle}
      >
        {/* Always drawn, not hover-only: a phone has no hover, and a row that
            only admits it opens when you are already touching it has not said
            so. Rule 8, the same argument `RowChevron` carries. */}
        <ChevronDownIcon
          aria-hidden
          className={`absolute right-0.5 top-[1.3rem] h-4 w-4 text-foreground/25 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
        <span className={grid.className} style={grid.style}>
          <span
            aria-hidden
            className={`font-mono text-[15px] leading-[1.35] tabular-nums ${
              position <= 3 ? "text-foreground" : "text-foreground/35"
            }`}
          >
            {String(position).padStart(2, "0")}
          </span>

          <span className="flex justify-start pt-0.5">
            <CompanyLogo size={44} ticker={item.ticker} />
          </span>

          <span className="min-w-0">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 truncate text-[18px] font-semibold leading-[1.3] tracking-[-0.014em] text-foreground lg:text-[20px]">
                {cleanCompanyName(item.company) || ticker}
              </span>
              <TickerPill ticker={ticker} />
            </span>

            {/* Who bought and when. Without it two rows for the same issuer in
                one month (PANR.L was featured twice in June) are
                indistinguishable while collapsed. */}
            {item.director_name || disclosed ? (
              <span className="mt-1.5 block text-[12.5px] leading-[1.45] text-foreground/60">
                {[item.director_name, disclosed].filter(Boolean).join(" · ")}
              </span>
            ) : null}

            <span className={`${chip("md")} mt-2 ${badge.className}`}>
              {badge.label}
            </span>
          </span>

          <span
            className={`text-right ${
              grid.tail === "perf" ? grid.tailClass : "hidden sm:block"
            }`}
          >
            {item.return_since_entry != null ? (
              <span
                className={`text-[17px] font-semibold leading-none tabular-nums tracking-[-0.02em] lg:text-[19px] ${returnTextClass(
                  item.return_since_entry,
                )}`}
              >
                {formatSignedPct(item.return_since_entry)}
              </span>
            ) : (
              // Not an em dash. A featured buy with no usable price series has
              // no mark, which is a different statement from a flat one.
              <span className="text-[11px] leading-[1.3] text-foreground/45">
                No mark yet
              </span>
            )}
            {item.return_since_entry != null ? (
              <span className="mt-1.5 block text-[11px] leading-[1.3] text-foreground/45">
                since entry
              </span>
            ) : null}
          </span>
        </span>
      </button>

      {open ? (
        <div className="space-y-4 pb-7 pt-1 lg:pl-[6rem]">{children}</div>
      ) : null}
    </li>
  );
}

function ArcHighlights({ item }: { item: MonthlyFeaturedItem }) {
  const arc = item.arc;
  const cards: { label: string; value: string; colorClass: string }[] = [];

  if (arc.peak_return != null) {
    cards.push({
      label: "In-month peak",
      value: formatSignedPct(arc.peak_return),
      colorClass: returnTextClass(arc.peak_return),
    });
  }
  if (arc.current_return != null) {
    cards.push({
      label: "Now",
      value: formatSignedPct(arc.current_return),
      colorClass: returnTextClass(arc.current_return),
    });
  }
  if (arc.give_back != null && arc.give_back > 0) {
    cards.push({
      label: "Given back",
      value: formatSignedPct(-arc.give_back),
      colorClass: returnTextClass(-arc.give_back),
    });
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-black/[0.06] bg-background/60 px-3 py-2 dark:border-white/[0.08]"
        >
          <div
            className={`text-base font-semibold tabular-nums ${c.colorClass}`}
          >
            {c.value}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

/** "2026-06-12" → "12 Jun 2026". Falls back to the raw value. */
function disclosedLabel(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(d.getTime())) return date;

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}
