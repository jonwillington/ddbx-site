/** Shared hero section. The market question as a headline above a layered
 *  atmospheric backdrop: bright warm spotlight at the headline, cool silver
 *  fall-off at the corners, slow-breathing pulse so the light reads as alive,
 *  and disclosure pulses — soft double-ripple blips scattered around the
 *  sides, like filings landing on a quiet radar. The bottom dissolves into
 *  the page colour without a hard rectangular band. All CSS-only; respects
 *  prefers-reduced-motion.
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

import { HeroDealMapLayer, useDealRadar } from "./hero-deal-radar";
import { HeroNotificationStack } from "./hero-notification-stack";

/** Filled pill — the row's single anchor. Exactly one CTA per market renders
 *  in this style: the App Store link where one exists (UK, US), otherwise
 *  the explainer is promoted so the row never reads as two equal ghost pills. */
const FILLED_CTA =
  "inline-flex items-center gap-2 rounded-full bg-[#5a4128] px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-[#49331f] hover:shadow-lg dark:bg-white dark:text-[#1a140d] dark:hover:bg-white/90";

const GHOST_CTA =
  "inline-flex items-center rounded-full bg-[#6b503921] px-6 py-3 text-base font-semibold text-[#5a4128] backdrop-blur-sm transition-all hover:bg-[#6b50382e] dark:bg-[#ad9479]/15 dark:text-[#ad9479] dark:hover:bg-[#ad9479]/25";

type PulsePoint = {
  left: string;
  top: string;
  size: number;
  delay: number;
};

/** Disclosure-pulse anchor points for desktop. Hand-placed in the side
 *  gutters — x stays outside the ~40-60% centre column so a ripple never
 *  crosses the headline, y stays above the bottom dissolve. Delays are
 *  deliberately uneven across the shared 9s cycle so somewhere on the stage
 *  blips roughly every second. */
const PULSE_POINTS: PulsePoint[] = [
  { left: "9%", top: "30%", size: 10, delay: 0 },
  { left: "20%", top: "60%", size: 8, delay: 2.1 },
  { left: "28%", top: "22%", size: 9, delay: 4.6 },
  { left: "14%", top: "46%", size: 11, delay: 7.2 },
  { left: "71%", top: "26%", size: 9, delay: 1.2 },
  { left: "84%", top: "56%", size: 11, delay: 3.7 },
  { left: "78%", top: "40%", size: 8, delay: 6.0 },
  { left: "91%", top: "32%", size: 10, delay: 8.1 },
];

/** Mobile anchor points. The centred headline fills the full width here, so
 *  the desktop gutter trick doesn't apply — instead we keep pulses (and the
 *  ~5x ripple spread) out of the headline's vertical band, confined to a top
 *  band above it and a band below it, with margin so a ripple never reaches
 *  the text. Fewer, smaller blips so the narrow stage doesn't read as busy. */
const MOBILE_PULSE_POINTS: PulsePoint[] = [
  { left: "16%", top: "9%", size: 8, delay: 0 },
  { left: "80%", top: "11%", size: 9, delay: 2.1 },
  { left: "46%", top: "6%", size: 7, delay: 4.6 },
  { left: "20%", top: "64%", size: 9, delay: 1.2 },
  { left: "82%", top: "66%", size: 8, delay: 3.7 },
  { left: "58%", top: "70%", size: 7, delay: 6.0 },
];

export function MarketHero({
  marketId,
  marketLabel,
  headline,
  subhead,
  hasTopNotice = false,
  hasRightDrawer = false,
  primaryCtaHref,
  onExplain,
  onViewReport,
  reportLabel,
  todayCount = 0,
  todaySignalCount = 0,
}: {
  /** Market identifier — selects the app icon and sample disclosures for the
   *  desktop notification showcase (UK vs US). */
  marketId?: string;
  marketLabel: string;
  /** Optional full headline override. When provided it replaces the templated
   *  "Which directors have been buying shares in {marketLabel} companies?" —
   *  used by markets where that phrasing doesn't fit (e.g. Congress, where
   *  members buy other companies, they aren't companies). */
  headline?: ReactNode;
  /** One-line answer for cold visitors — what the product does for this
   *  market. When a market does not provide an explicit headline, this copy is
   *  promoted into the main `<h1>` so mobile and desktop both show the updated
   *  action-oriented message. */
  subhead?: ReactNode;
  /** When the market carries a beta/advisory notice, the floating <BetaTag/>
   *  sits at the top of the hero. Desktop has room to spare; on the compact
   *  mobile hero the badge would land on the headline, so we reserve top
   *  space for it here. */
  hasTopNotice?: boolean;
  /** Whether the page reserves a right-hand drawer (`lg:mr-80`). When it does,
   *  the two-column showcase only has room from `xl` up — below that it falls
   *  back to the single-column layout so the drawer never squeezes it. */
  hasRightDrawer?: boolean;
  /** Optional App Store link — when present, the right-hand notification
   *  showcase panel renders and links here (the panel is the only download CTA;
   *  the left column carries the explainer). */
  primaryCtaHref?: string;
  /** When provided, a "What are we looking for?" pill renders under the
   *  headline and opens the per-market explainer sheet. It's the left column's
   *  filled anchor (the download CTA lives on the right-hand panel). */
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
  const resolvedHeadline = headline ?? subhead ?? (
    <>
      Which directors have been buying shares in{" "}
      <span className="text-[#5a4128] dark:text-[#ad9479]">{marketLabel}</span>{" "}
      companies?
    </>
  );
  const displaySubhead = headline ? subhead : undefined;

  /** App markets (UK, US) get the two-column desktop hero: text on the left,
   *  the notification app-showcase panel on the right. Markets without an App
   *  Store link (NL, SE, Congress) keep the original centred layout. Mobile is
   *  centred on every market — the showcase panel is desktop-only. */
  const appShowcase = !!primaryCtaHref;
  // Shared deal-radar clock — drives the full-bleed background map and the
  // foreground notification stack from one source so they stay in lockstep.
  const radar = useDealRadar(marketId, appShowcase);
  // The two-column showcase needs more room when a right drawer is present, so
  // it switches on at `xl` then; otherwise `lg`. Alignment + visibility classes
  // track that same breakpoint so the headline only goes left-aligned once the
  // two-column layout is actually showing.
  const twoColShow = hasRightDrawer ? "hidden xl:flex" : "hidden lg:flex";
  const centeredHide = hasRightDrawer ? "xl:hidden" : "lg:hidden";
  const headlineAlign = !appShowcase
    ? "mx-auto"
    : hasRightDrawer
      ? "mx-auto xl:mx-0"
      : "mx-auto lg:mx-0";
  const ctaJustify = !appShowcase
    ? "justify-center"
    : hasRightDrawer
      ? "justify-center xl:justify-start"
      : "justify-center lg:justify-start";

  const headlineBlock = (
    <div className="space-y-3 md:space-y-5">
      <h1
        className={`${headlineAlign} max-w-[600px] text-balance text-[40px] font-semibold tracking-tight leading-[1.05] md:text-[64px] md:leading-[1.02]`}
      >
        {resolvedHeadline}
      </h1>
      {displaySubhead && (
        <p
          className={`${headlineAlign} max-w-[480px] text-balance text-base leading-relaxed text-foreground/60`}
        >
          {displaySubhead}
        </p>
      )}
    </div>
  );

  const ctaRow = (onExplain || onViewReport) && (
    <div className={`flex flex-wrap items-center gap-3 ${ctaJustify}`}>
      {/* On app markets the App Store button (right) is the primary CTA, so the
          explainer reads as secondary (ghost). On markets without an app link it
          has nothing to defer to and becomes the primary (filled) anchor. */}
      {onExplain && (
        <button
          className={primaryCtaHref ? GHOST_CTA : FILLED_CTA}
          data-ga-event="cta_hero_open_explainer"
          data-ga-label="What are we looking for"
          type="button"
          onClick={onExplain}
        >
          What are we looking for?
        </button>
      )}
      {onViewReport && (
        <button
          className={GHOST_CTA}
          data-ga-event="cta_hero_view_report"
          data-ga-label={`View ${reportLabel ?? "latest"} report`}
          type="button"
          onClick={onViewReport}
        >
          View {reportLabel} Report
        </button>
      )}
    </div>
  );

  // Live proof line — the headline asks the question, this shows we're
  // answering it today. Counts arrive with the page's dealings fetch, so the
  // line fades in with the data; hidden on mobile where the Today card directly
  // below carries the same state, bigger.
  const proofLine = todayCount > 0 && (
    <p
      className={`hidden animate-content-in items-center gap-2 text-sm text-foreground/55 md:flex ${ctaJustify}`}
    >
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
  );

  // The live notification stack now carries per-card company avatars so each
  // depth layer feels like one joined element.
  const notifRow = (
    <div className="min-w-0">
      <HeroNotificationStack deals={radar.deals} tick={radar.tick} />
    </div>
  );

  return (
    <header
      className={`relative -mt-4 md:-mt-6 min-h-[58svh] flex flex-col animate-content-in ${
        appShowcase
          ? hasRightDrawer
            ? "xl:min-h-[560px]"
            : "lg:min-h-[560px]"
          : "md:min-h-[380px]"
      }`}
    >
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
        /* A general wash that enters from the far (left) edge of the screen and
           fades out past the headline, so the text stays legible over the
           panning basemap and the map's left edge dissolves into the page.
           Themed to match the page (cream in light, near-black in dark). */
        .hero-left-scrim {
          background: linear-gradient(to right,
            #f5f0e8 0%,
            rgba(245, 240, 232, 0.97) 14%,
            rgba(245, 240, 232, 0.55) 34%,
            transparent 54%);
        }
        :is(.dark) .hero-left-scrim {
          background: linear-gradient(to right,
            #15110d 0%,
            rgba(21, 17, 13, 0.97) 14%,
            rgba(21, 17, 13, 0.55) 34%,
            transparent 54%);
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
        /* Disclosure pulses — a blip pops in, sends out two slow ripple
           rings, lingers, then fades. Each point fires once per 9s cycle
           at an uneven stagger so the rhythm reads as filings landing,
           not a metronome; with 8 points that's a blip roughly every
           second and usually 2-3 alive at once. Base opacity 0: the
           keyframes own visibility. */
        .hero-pulse {
          position: absolute; border-radius: 50%; pointer-events: none;
          opacity: 0; background: #8B6040;
          will-change: opacity, transform;
          animation: hero-pulse-dot 9s ease-out infinite;
        }
        .hero-pulse-ring {
          position: absolute; inset: 0; border-radius: 50%;
          opacity: 0; border: 1.5px solid rgba(139, 96, 64, 0.8);
          will-change: opacity, transform;
          animation: hero-pulse-ring 9s ease-out infinite;
          animation-delay: inherit;
        }
        .hero-pulse-ring-2 { animation-name: hero-pulse-ring-2; }
        :is(.dark) .hero-pulse { background: #ad9479; }
        :is(.dark) .hero-pulse-ring { border-color: rgba(173, 148, 121, 0.7); }
        @keyframes hero-pulse-dot {
          0%   { opacity: 0;    transform: scale(0); }
          2.5% { opacity: 0.9;  transform: scale(1.3); }
          5%   { opacity: 0.75; transform: scale(1); }
          22%  { opacity: 0.55; transform: scale(1); }
          30%  { opacity: 0;    transform: scale(0.4); }
          100% { opacity: 0;    transform: scale(0); }
        }
        @keyframes hero-pulse-ring {
          0%   { opacity: 0;    transform: scale(0.5); }
          2.5% { opacity: 0.7; }
          18%  { opacity: 0;    transform: scale(3.8); }
          100% { opacity: 0;    transform: scale(3.8); }
        }
        @keyframes hero-pulse-ring-2 {
          0%, 4% { opacity: 0;  transform: scale(0.5); }
          6%   { opacity: 0.45; }
          22%  { opacity: 0;    transform: scale(5.2); }
          100% { opacity: 0;    transform: scale(5.2); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-spotlight, .hero-shimmer { animation: none !important; }
          .hero-pulse { animation: none !important; opacity: 0.22; }
          .hero-pulse-ring { display: none; }
        }
      `}</style>

      {/* Atmospheric backdrop. Now on every breakpoint — the tall mobile hero
          leans on it to feel like a lit stage. Order matters: warm floor sits
          behind so the shimmer + spotlight feel like they're cast on a
          surface; the vignette goes last so light falls off toward the
          corners. This wrapper is position:static so its absolute children
          still anchor to the <header> and keep their z-order relative to the
          headline. */}
      {/* Full-bleed background breakout. The <header> itself now sits in the
          normal content column (so it respects the page's right drawer and the
          content never slides under it); only this layer breaks out to the full
          viewport width via the left-1/2 / -translate-x-1/2 trick. Its own
          overflow-hidden clips the map + disclosure pulses. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen overflow-hidden z-0"
      >
        {/* Deal-radar map — the hero's living background on app markets
            (desktop). The atmospheric fades + vignette below blend its edges
            into the navbar and page. */}
        {appShowcase && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 hidden md:block"
            >
            <HeroDealMapLayer
              activeIndex={radar.activeIndex}
              deals={radar.deals}
              isDark={radar.isDark}
              mapConfig={radar.mapConfig}
            />
          </div>
          {/* General wash entering from the far (left) edge of the screen,
              fading out past the headline — keeps the text legible and melts
              the map's left edge into the page. */}
          <div
            aria-hidden
            className="hero-left-scrim pointer-events-none absolute inset-0 z-[5] hidden md:block"
          />
        </>
      )}

      <div aria-hidden className="block">
        <div aria-hidden className="hero-warm-floor z-0" />
        {/* Spotlight + shimmer light the stage on non-app markets. App markets
            drop the animated backdrop entirely: desktop has the live map, and
            mobile leads with the notification scroller instead. */}
        {!appShowcase && (
          <>
            <div aria-hidden className="hero-shimmer z-0" />
            <div aria-hidden className="hero-spotlight z-0" />
          </>
        )}
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

        {/* Disclosure pulses — kept clear of the centre column (~40-60%)
            where the headline sits, and of the bottom fade. Sizes and
            delays vary so no two blips read as twins. On the app-market
            desktop the map's own beacon replaces these, so they're dropped
            there (mobile still gets them — no map on phones). */}
        {!appShowcase &&
          PULSE_POINTS.map((p) => (
            <span
              key={`d-${p.left}-${p.top}`}
              className="hero-pulse z-[2] hidden md:block"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                animationDelay: `${p.delay}s`,
              }}
            >
              <span className="hero-pulse-ring" />
              <span className="hero-pulse-ring hero-pulse-ring-2" />
            </span>
          ))}
        {!appShowcase &&
          MOBILE_PULSE_POINTS.map((p) => (
            <span
              key={`m-${p.left}-${p.top}`}
              className="hero-pulse z-[2] md:hidden"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                animationDelay: `${p.delay}s`,
              }}
            >
              <span className="hero-pulse-ring" />
              <span className="hero-pulse-ring hero-pulse-ring-2" />
            </span>
          ))}
        </div>
      </div>

      <div
        className={`relative z-10 flex-1 flex flex-col px-4 md:py-16 ${
          hasTopNotice ? "pt-16 pb-6" : "py-6"
        }`}
      >
        {appShowcase ? (
          <>
            {/* Desktop: headline (left) + live notification stack (right) float
                over the full-bleed map. The left-edge wash (above) keeps the
                headline legible; the stack offers the App Store link. Two-column
                only once there's room (lg, or xl when a drawer is present). */}
            <div
              className={`m-auto ${twoColShow} w-full max-w-6xl items-center gap-10`}
            >
              <div className="flex-1">
                <div className="flex max-w-[520px] flex-col gap-6 text-left">
                  {headlineBlock}
                  {ctaRow}
                  {proofLine}
                </div>
              </div>
              <div className="w-[440px] shrink-0">
                {notifRow}
                <div className="mt-7">
                  <a
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5a4128] px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-[#49331f] hover:shadow-lg dark:bg-white dark:text-[#1a140d] dark:hover:bg-white/90"
                    data-ga-event="cta_hero_download_app"
                    data-ga-label="Hero desktop download"
                    href={primaryCtaHref}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-[15px] w-[15px] shrink-0"
                      fill="currentColor"
                      viewBox="0 0 384 512"
                    >
                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                    </svg>
                    Download on the App Store
                  </a>
                  <p className="mt-2.5 text-center text-xs leading-snug text-foreground/55">
                    Start your 7 day free trial. Price varies on location.
                  </p>
                </div>
              </div>
            </div>

            {/* Single column: notification scroller on top, then the centred
                headline. Used on mobile and on the mid-width desktop range
                before the two-column kicks in. On mobile the floating download
                bar handles installs; from md up (where that bar is hidden) the
                download CTA below stands in. */}
            <div
              className={`m-auto flex ${centeredHide} flex-col items-center gap-7 text-center`}
            >
              {/* No logo on mobile — the stack is centred on its own. */}
              <div className="w-full max-w-[330px]">
                <HeroNotificationStack deals={radar.deals} tick={radar.tick} />
              </div>
              {headlineBlock}
              <a
                className="hidden md:inline-flex items-center justify-center gap-2 rounded-full bg-[#5a4128] px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-[#49331f] hover:shadow-lg dark:bg-white dark:text-[#1a140d] dark:hover:bg-white/90"
                data-ga-event="cta_hero_download_app"
                data-ga-label="Hero compact download"
                href={primaryCtaHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <svg
                  aria-hidden="true"
                  className="h-[15px] w-[15px] shrink-0"
                  fill="currentColor"
                  viewBox="0 0 384 512"
                >
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
                Download on the App Store
              </a>
              {ctaRow}
              {proofLine}
            </div>
          </>
        ) : (
          <div className="m-auto flex flex-col items-center justify-center gap-6 text-center md:gap-8">
            {headlineBlock}
            {ctaRow}
            {proofLine}
          </div>
        )}
      </div>
    </header>
  );
}
