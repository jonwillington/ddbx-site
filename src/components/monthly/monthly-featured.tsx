import type { MonthlyFeaturedItem } from "@/types/ddbx";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import { MonthlyPriceChart } from "./monthly-price-chart";
import { Prose } from "./monthly-prose";
import { featureBadge, returnTextClass, sentimentOrder } from "./monthly-utils";

import { chip } from "@/components/chip";
import { formatSignedPct } from "@/lib/performance/format";
import { CompanyLogo } from "@/components/company-logo";

/** The curated standout buys, sorted positive → neutral → negative. Each card
 *  expands in place to reveal the price arc, a price chart and the per-item
 *  retrospective / forward narrative. */
export function MonthlyFeatured({
  items,
  heading = true,
  openFirst = false,
}: {
  items: MonthlyFeaturedItem[];
  /** Off when the caller already sets a section heading above this block. */
  heading?: boolean;
  /** Expand the first card on mount. The archived report page sets this: the
   *  richest prose we publish is inside these cards, and while they're all
   *  collapsed none of it is in the document at all. */
  openFirst?: boolean;
}) {
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => sentimentOrder(a.sentiment) - sentimentOrder(b.sentiment),
      ),
    [items],
  );

  if (sorted.length === 0) return null;

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
}: {
  item: MonthlyFeaturedItem;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const badge = featureBadge(item.feature_reason);
  const entryGbp =
    item.entry_price_pence != null ? item.entry_price_pence / 100 : null;

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
        </div>
      )}
    </div>
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
