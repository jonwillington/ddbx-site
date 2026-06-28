// Mobile teaser for the UK broker comparison directory. Surfaces under the
// Today deck on the UK market page (the fixed right rail that carries the
// brokers on desktop is hidden on phones). Self-loads the UK broker list,
// shows a handful of logos, and links through to /compare. Always public —
// intentionally does NOT import @/lib/discretion.
import { useEffect, useRef, useState } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

import { api, type BrokerOffer } from "@/lib/api";

import { BrokerLogo } from "./broker-ui";

const LOGO_COUNT = 5;

export function BrokerReviewsPromo({
  brokers: provided,
  className,
  variant = "card",
}: {
  /** Pass an already-loaded list to skip the fetch; omit to self-load. */
  brokers?: BrokerOffer[] | null;
  className?: string;
  /** "card" = the tall stacked teaser. "bar" = a thin single-line strip for
   *  slotting into the deals table. */
  variant?: "card" | "bar";
}) {
  const [fetched, setFetched] = useState<BrokerOffer[] | null>(null);
  // The "View all" button slides + fades up as the card scrolls into view.
  // One-shot: once revealed it stays put. Reduced-motion users get it visible
  // from the start (the IO never re-hides it).
  const buttonRef = useRef<HTMLSpanElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (provided) return;
    api
      .brokers("UK")
      .then(setFetched)
      .catch(() => setFetched([]));
  }, [provided]);

  useEffect(() => {
    const el = buttonRef.current;

    if (!el || revealed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);

      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );

    io.observe(el);

    return () => io.disconnect();
  }, [revealed, fetched]);

  const brokers = provided ?? fetched;

  if (!brokers || brokers.length === 0) return null;

  // Lead with the editorially recommended platforms so the most recognisable
  // logos sit up front, then fill to LOGO_COUNT.
  const logos = [...brokers]
    .sort((a, b) => Number(b.recommended) - Number(a.recommended))
    .slice(0, LOGO_COUNT);

  // Thin one-line strip for the deals table — heading + logos + CTA on a single
  // row. Logos drop off on narrow screens so the row never wraps.
  if (variant === "bar") {
    return (
      <a
        className={`group flex items-center gap-4 overflow-hidden rounded-xl border border-[#e8e0d5] bg-gradient-to-br from-[#faf7f2] to-[#f1eae0] px-4 py-3 transition-colors dark:border-separator dark:from-surface dark:to-surface-secondary ${className ?? ""}`}
        data-ga-event="cta_broker_reviews"
        data-ga-label="market_table_bar"
        href="/compare"
        rel="noopener"
        target="_blank"
      >
        <div className="flex shrink-0 items-center">
          {logos.map((b, i) => (
            <span
              key={b.slug}
              className="rounded-xl ring-2 ring-[#faf7f2] dark:ring-surface"
              style={{ marginLeft: i === 0 ? 0 : -10, zIndex: LOGO_COUNT - i }}
            >
              <BrokerLogo broker={b} size={40} />
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5a4128]/70 dark:text-[#d8c4af]/70">
            UK brokers
          </p>
          <h3 className="truncate text-lg font-semibold leading-snug text-foreground md:text-xl">
            Read reviews of UK trading platforms
          </h3>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#5a4128] px-3 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-[#4a351f] dark:bg-white dark:text-[#1a140d] dark:group-hover:bg-white/90">
          View all
          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
        </span>
      </a>
    );
  }

  return (
    <a
      className={`group block overflow-hidden rounded-2xl border border-[#e8e0d5] bg-gradient-to-br from-[#faf7f2] to-[#f1eae0] p-5 shadow-[0_18px_44px_-20px_rgba(30,21,6,0.28)] transition-colors dark:border-separator dark:from-surface dark:to-surface-secondary ${className ?? ""}`}
      data-ga-event="cta_broker_reviews"
      data-ga-label="market_today_mobile"
      href="/compare"
      rel="noopener"
      target="_blank"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5a4128]/70 dark:text-[#d8c4af]/70">
        UK brokers
      </p>
      <h3 className="mt-1.5 text-lg font-semibold leading-snug text-foreground">
        Read reviews of UK trading platforms
      </h3>
      <p className="mt-1 text-sm text-foreground/55">
        Fees, ISAs and sign-up offers — independently ranked.
      </p>

      <div className="mt-4 flex items-center">
        {logos.map((b, i) => (
          <span
            key={b.slug}
            className="rounded-xl ring-2 ring-[#faf7f2] dark:ring-surface"
            style={{ marginLeft: i === 0 ? 0 : -10, zIndex: LOGO_COUNT - i }}
          >
            <BrokerLogo broker={b} size={44} />
          </span>
        ))}
        {brokers.length > LOGO_COUNT && (
          <span className="ml-2.5 text-xs font-medium text-foreground/45">
            +{brokers.length - LOGO_COUNT} more
          </span>
        )}
      </div>

      <span
        ref={buttonRef}
        className={`mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#5a4128] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-500 ease-out group-hover:bg-[#4a351f] dark:bg-white dark:text-[#1a140d] dark:group-hover:bg-white/90 ${
          revealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        View all
        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
      </span>
    </a>
  );
}
