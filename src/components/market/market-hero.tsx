/** Shared hero section. The market question as a serif display headline above
 *  a layered atmospheric backdrop: bright warm spotlight at the headline, cool
 *  silver fall-off at the corners, slow-breathing pulse so the light reads as
 *  alive. The bottom dissolves into the page colour without a hard rectangular
 *  band. All CSS-only; respects prefers-reduced-motion.
 *
 *  The headline is the page's <h1> — market pages render no other top-level
 *  heading. Under it: an optional one-line subhead for first-time visitors,
 *  the CTA row, and a live "N filings so far today" line fed by the same
 *  dealings the page has already loaded — the hero asks the question, the
 *  live line proves we're answering it.
 *
 *  Layout: page is wrapped in `container max-w-7xl`, so the hero uses the
 *  `w-screen left-1/2 -translate-x-1/2` break-out trick to span the full
 *  viewport edge-to-edge. Fixed `min-h` keeps the hero the same height on
 *  every market — the optional beta notice is rendered absolutely at the
 *  top so it doesn't push the headline around, and slides in instead of
 *  popping when the user navigates to a beta market. */
import type { ReactNode } from "react";

/** Filled pill — the row's single anchor. Exactly one CTA per market renders
 *  in this style: the App Store link where one exists (UK), otherwise the
 *  explainer is promoted so the row never reads as two equal ghost pills. */
const FILLED_CTA =
  "inline-flex items-center gap-2 rounded-full bg-[#5a4128] px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-[#49331f] hover:shadow-lg dark:bg-[#ad9479] dark:text-[#1a140d] dark:hover:bg-[#bda58a]";

const GHOST_CTA =
  "inline-flex items-center rounded-full bg-[#6b503921] px-6 py-3 text-base font-semibold text-[#5a4128] backdrop-blur-sm transition-all hover:bg-[#6b50382e] dark:bg-[#ad9479]/15 dark:text-[#ad9479] dark:hover:bg-[#ad9479]/25";

export function MarketHero({
  marketLabel,
  headline,
  subhead,
  hasTopNotice = false,
  primaryCtaHref,
  primaryCtaLabel,
  onExplain,
  onViewReport,
  reportLabel,
  todayCount = 0,
  todaySignalCount = 0,
}: {
  marketLabel: string;
  /** Optional full headline override. When provided it replaces the templated
   *  "Which directors have been buying shares in {marketLabel} companies?" —
   *  used by markets where that phrasing doesn't fit (e.g. Congress, where
   *  members buy other companies, they aren't companies). */
  headline?: ReactNode;
  /** One-line answer for cold visitors — what the product does for this
   *  market. Rendered md+ only; the compact mobile hero stays headline+CTAs. */
  subhead?: ReactNode;
  /** When the market carries a beta/advisory notice, the floating <BetaTag/>
   *  sits at the top of the hero. Desktop has room to spare; on the compact
   *  mobile hero the badge would land on the headline, so we reserve top
   *  space for it here. */
  hasTopNotice?: boolean;
  /** Optional primary CTA rendered as an external link (new tab). */
  primaryCtaHref?: string;
  /** Label for the primary external CTA. */
  primaryCtaLabel?: string;
  /** When provided, a "What are we looking for?" pill renders under the
   *  headline and opens the per-market explainer sheet. Quiet when an app
   *  CTA anchors the row; promoted to the filled style otherwise. */
  onExplain?: () => void;
  /** When provided (a monthly recap exists), a secondary "View the {month}
   *  report" pill renders beside the explainer and opens the recap modal. */
  onViewReport?: () => void;
  /** Short month label for the report CTA, e.g. "May". */
  reportLabel?: string;
  /** Today's filing count for this market — drives the live proof line.
   *  0 (or omitted, e.g. while loading) hides the line. */
  todayCount?: number;
  /** How many of today's filings are above routine (rated or triaged as
   *  promising/maybe). */
  todaySignalCount?: number;
}) {
  return (
    <header className="relative w-screen left-1/2 -translate-x-1/2 -mt-4 md:-mt-6 min-h-[120px] md:min-h-[380px] flex flex-col overflow-hidden animate-content-in">
      <style>{`
        @keyframes hero-spotlight-breathe {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.04); }
        }
        @keyframes hero-shimmer-drift {
          0%   { transform: translate3d(-6%, -3%, 0); }
          50%  { transform: translate3d( 6%,  3%, 0); }
          100% { transform: translate3d(-6%, -3%, 0); }
        }
        .hero-spotlight {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 55% 65% at 50% 32%,
              rgba(255, 248, 232, 0.85) 0%,
              rgba(255, 248, 232, 0.45) 25%,
              rgba(255, 248, 232, 0.12) 50%,
              transparent 70%);
          will-change: opacity, transform;
          animation: hero-spotlight-breathe 9s ease-in-out infinite;
        }
        .hero-shimmer {
          position: absolute; inset: -20% -10%;
          background:
            radial-gradient(ellipse 50% 50% at 18% 24%, rgba(206, 214, 228, 0.40) 0%, transparent 55%),
            radial-gradient(ellipse 45% 50% at 82% 18%, rgba(196, 206, 222, 0.32) 0%, transparent 55%),
            radial-gradient(ellipse 55% 40% at 35% 78%, rgba(214, 218, 226, 0.22) 0%, transparent 60%);
          will-change: transform;
          animation: hero-shimmer-drift 22s ease-in-out infinite;
        }
        .hero-warm-floor {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 110% 70% at 50% 60%,
              rgba(196, 168, 130, 0.10) 0%,
              transparent 65%);
        }
        .hero-vignette {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 90% 95% at 50% 40%,
              transparent 50%,
              rgba(120, 100, 80, 0.05) 80%,
              rgba(80, 65, 50, 0.10) 100%);
        }
        :is(.dark) .hero-spotlight {
          background:
            radial-gradient(ellipse 55% 65% at 50% 32%,
              rgba(196, 168, 130, 0.20) 0%,
              rgba(196, 168, 130, 0.10) 25%,
              rgba(196, 168, 130, 0.04) 50%,
              transparent 70%);
        }
        :is(.dark) .hero-shimmer {
          background:
            radial-gradient(ellipse 50% 50% at 18% 24%, rgba(130, 140, 160, 0.18) 0%, transparent 55%),
            radial-gradient(ellipse 45% 50% at 82% 18%, rgba(120, 130, 150, 0.14) 0%, transparent 55%),
            radial-gradient(ellipse 55% 40% at 35% 78%, rgba(140, 145, 160, 0.10) 0%, transparent 60%);
        }
        :is(.dark) .hero-warm-floor { display: none; }
        :is(.dark) .hero-vignette {
          background:
            radial-gradient(ellipse 90% 95% at 50% 40%,
              transparent 50%,
              rgba(0, 0, 0, 0.20) 80%,
              rgba(0, 0, 0, 0.35) 100%);
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-spotlight, .hero-shimmer { animation: none !important; }
        }
      `}</style>

      {/* Atmospheric backdrop — md+ only. On mobile the hero collapses to a
          compact headline on the plain page colour; the animated atmosphere
          felt heavy in the small viewport. Order matters: warm floor sits
          behind so the shimmer + spotlight feel like they're cast on a
          surface; the vignette goes last so light falls off toward the
          corners. This wrapper is position:static so its absolute children
          still anchor to the <header> and keep their z-order relative to the
          headline. */}
      <div aria-hidden className="hidden md:block">
        <div aria-hidden className="hero-warm-floor z-0" />
        <div aria-hidden className="hero-shimmer z-0" />
        <div aria-hidden className="hero-spotlight z-0" />
        <div aria-hidden className="hero-vignette z-[1] pointer-events-none" />

        {/* Top fade dissolves into the navbar; bottom fade passes through a
          slightly darker tone before resolving to the page colour so the
          table beneath reads as sitting *under* the lit stage. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 z-[6] bg-gradient-to-b from-[#f5f0e8] dark:from-background to-transparent" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-56 z-[6] dark:hidden"
          style={{
            background:
              "linear-gradient(to top, #f5f0e8 0%, rgba(245,240,232,0.94) 20%, rgba(245,240,232,0.58) 48%, rgba(245,240,232,0) 82%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-56 z-[6] hidden dark:block"
          style={{
            background:
              "linear-gradient(to top, var(--color-background, #15110d) 0%, rgba(21,17,13,0.85) 32%, rgba(21,17,13,0.4) 60%, transparent 100%)",
          }}
        />
      </div>

      <div
        className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-6 md:gap-8 px-4 md:py-16 text-center ${
          hasTopNotice ? "pt-16 pb-6" : "py-6"
        }`}
      >
        <div className="space-y-3 md:space-y-5">
          <h1 className="mx-auto max-w-[620px] text-balance font-serif text-[30px] font-normal leading-[1.08] tracking-tight md:text-[58px] md:leading-[1.04]">
            {headline ?? (
              <>
                Which directors have been buying shares in{" "}
                <span className="italic text-[#5a4128] dark:text-[#ad9479]">
                  {marketLabel}
                </span>{" "}
                companies?
              </>
            )}
          </h1>
          {subhead && (
            <p className="mx-auto hidden max-w-[480px] text-balance text-base leading-relaxed text-foreground/60 md:block">
              {subhead}
            </p>
          )}
        </div>

        {(primaryCtaHref || onExplain || onViewReport) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {primaryCtaHref && (
              <a
                className={FILLED_CTA}
                href={primaryCtaHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <svg
                  aria-hidden="true"
                  className="h-[18px] w-[18px] -mt-0.5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 384 512"
                >
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
                {primaryCtaLabel ?? "Download the app"}
              </a>
            )}
            {onExplain && (
              <button
                className={primaryCtaHref ? GHOST_CTA : FILLED_CTA}
                type="button"
                onClick={onExplain}
              >
                What are we looking for?
              </button>
            )}
            {onViewReport && (
              <button className={GHOST_CTA} type="button" onClick={onViewReport}>
                View {reportLabel} Report
              </button>
            )}
          </div>
        )}

        {/* Live proof line — the headline asks the question, this shows we're
            answering it today. Counts arrive with the page's dealings fetch,
            so the line fades in with the data; hidden on mobile where the
            Today card directly below carries the same state, bigger. */}
        {todayCount > 0 && (
          <p className="hidden animate-content-in items-center gap-2 text-sm text-foreground/55 md:flex">
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22a06b] opacity-50 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22a06b]" />
            </span>
            {todayCount} filing{todayCount === 1 ? "" : "s"} so far today
            {todaySignalCount > 0 && (
              <>
                {" "}
                · {todaySignalCount} signal{todaySignalCount === 1 ? "" : "s"}
              </>
            )}
          </p>
        )}
      </div>
    </header>
  );
}
