/** Shared hero section. Two species, per the house rule "contained, not
 *  blended":
 *
 *  App markets (UK/US/Congress) — two clean layers. The MESSAGE layer
 *  (headline, bullets, CTAs, live proof line) sits directly on the page
 *  ground, over nothing but one very subtle warm ambient gradient — no
 *  scrim, no spotlight, nothing the text has to compete with. The PROOF
 *  layer is `HeroDealShowcase`: the deal-radar map contained in a rounded
 *  hairline-bordered panel beside the message, with the company queue on top
 *  and the live notification stack docked at its foot. The panel's frame is
 *  the edge — no fades melting it into the page.
 *
 *  Non-app markets (NL/SE) keep the original centred layout on the lit
 *  atmospheric stage: warm spotlight, silver shimmer, disclosure pulses,
 *  vignette. All CSS-only; respects prefers-reduced-motion.
 *
 *  The headline is the page's <h1> — market pages render no other top-level
 *  heading. Under it: an optional one-line subhead for first-time visitors,
 *  the CTA row, and a live "N filings so far today" line fed by the same
 *  dealings the page has already loaded — the hero asks the question, the
 *  live line proves we're answering it.
 *
 *  Non-app stage layout: on mobile the backdrop uses the `w-screen left-1/2
 *  -translate-x-1/2` break-out trick to span the viewport edge-to-edge. From
 *  `md` up it instead stays inside the content column as a framed, rounded
 *  panel — a lit stage clipped by a hairline border, one tonal step darker
 *  than the page. Fixed `min-h` keeps the hero the same height on every
 *  market — the optional beta notice is rendered absolutely at the top so it
 *  doesn't push the headline around, and slides in instead of popping when
 *  the user navigates to a beta market. */
import type { ReactNode } from "react";

import { CheckIcon } from "@heroicons/react/20/solid";

import { HeroDealShowcase } from "./hero-deal-showcase";
import { useDealRadar } from "./hero-deal-radar";
import { HeroNotificationStack } from "./hero-notification-stack";

import {
  BUTTON_FILLED,
  BUTTON_GHOST,
  BUTTON_RADIUS,
} from "@/components/button";
import { chip } from "@/components/chip";
import { StoreButtons } from "@/components/store-buttons";

/** Filled primary — the row's single anchor. Exactly one CTA per market
 *  renders in this style: the App Store link where one exists (UK, US),
 *  otherwise the explainer is promoted so the row never reads as two equal
 *  ghost buttons. */
const FILLED_CTA = `inline-flex items-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-6 py-3 text-base font-semibold shadow-md transition-[background-color,box-shadow] hover:shadow-lg`;

/** Ghost secondary — same radius and near-black family as the primary, just
 *  turned down. The old brown capsule read as a chip, not a button. A visible
 *  hairline border does the affordance work here: the 7% tint alone dissolved
 *  into the hero's cream wash and read as a disabled chip. */
const GHOST_CTA = `inline-flex items-center ${BUTTON_RADIUS} ${BUTTON_GHOST} border border-ink/[0.18] dark:border-white/20 px-6 py-3 text-base font-semibold backdrop-blur-sm transition-colors`;

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
  bullets,
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
  /** Checkmark bullets rendered in place of the subhead paragraph. Their
   *  presence also drops the trial eyebrow chip — the offer is expected to
   *  carry in the headline/bullets themselves (see MarketConfig.heroBullets). */
  bullets?: ReactNode[];
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
      <span className="text-brand-brown dark:text-brand-tan">
        {marketLabel}
      </span>{" "}
      companies?
    </>
  );
  const displaySubhead = headline ? subhead : undefined;
  /** When the one-line subhead is promoted into the <h1> (markets without an
   *  explicit headline — SE/NL), it's a full sentence, not a slogan: render it
   *  at a much smaller size so it reads as copy, not a shouting wall. */
  const promotedSubhead = !headline && !!subhead;

  /** App markets (UK, US, Congress — which ships inside the US app) get the
   *  two-column desktop hero: text on the left, the notification app-showcase
   *  panel on the right. Markets without an App Store link (NL, SE) keep the
   *  original centred layout. Mobile is centred on every market — the showcase
   *  panel is desktop-only. */
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
      {/* Trial promo eyebrow — the offer, called out where the eye lands
          first instead of buried under the App Store button. Chip-system
          capsule in the brand brown; app markets only (no trial elsewhere).
          Markets that moved the offer into the headline/bullets drop it. */}
      {appShowcase && !bullets && (
        <div className={`flex ${ctaJustify}`}>
          <span
            className={`${chip("lg")} bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/15 dark:text-brand-tan`}
          >
            7-day free trial · Cancel any time
          </span>
        </div>
      )}
      <h1
        className={`${headlineAlign} text-balance font-semibold tracking-tight ${
          promotedSubhead
            ? "max-w-[560px] text-[24px] leading-[1.25] md:text-[32px] md:leading-[1.2]"
            : "max-w-[600px] text-[40px] leading-[1.05] md:text-[64px] md:leading-[1.02]"
        }`}
      >
        {resolvedHeadline}
      </h1>
      {bullets ? (
        <ul className={`${headlineAlign} max-w-[480px] space-y-2 text-left`}>
          {bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-[15px] leading-snug text-foreground/70"
            >
              <CheckIcon
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-positive"
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        displaySubhead && (
          <p
            className={`${headlineAlign} max-w-[480px] text-balance text-base leading-relaxed text-foreground/60`}
          >
            {displaySubhead}
          </p>
        )
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

  // Two-column desktop CTA row: the App Store button leads, sized to its
  // content like any other button — it belongs to the message column, not to
  // the showcase panel, so it no longer inherits the notification stack's
  // width. The explainer stays the ghost beside it.
  const ctaRowDesktop = (
    <div className={`flex flex-wrap items-center gap-3 ${ctaJustify}`}>
      <StoreButtons
        buttonClassName={FILLED_CTA}
        gaEvent="cta_hero_download_app"
        gaLabel="Hero desktop download"
        marketId={marketId ?? "uk"}
      />
      {onExplain && (
        <button
          className={GHOST_CTA}
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
  // answering it today. Counts arrive with the page's dealings fetch; on app
  // markets the line never disappears (a live "watching" state stands in while
  // the count is 0 or loading) so the column always carries proof under the
  // CTAs instead of dead space. Hidden on mobile where the Today card directly
  // below carries the same state, bigger.
  const proofLine = (todayCount > 0 || appShowcase) && (
    <p
      className={`hidden animate-content-in items-center gap-2 text-sm text-foreground/55 md:flex ${ctaJustify}`}
    >
      <span aria-hidden className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22a06b] opacity-50 motion-reduce:hidden" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22a06b]" />
      </span>
      {todayCount > 0 ? (
        <>
          {todayCount} filing{todayCount === 1 ? "" : "s"} so far today
          {todaySignalCount > 0 && (
            <>
              {" "}
              · {todaySignalCount} signal{todaySignalCount === 1 ? "" : "s"}
            </>
          )}
        </>
      ) : (
        <>Live · watching today&rsquo;s filings as they land</>
      )}
    </p>
  );

  return (
    <header
      className={`relative -mt-4 md:mt-0 md:min-h-[58svh] flex flex-col animate-content-in ${
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
              rgba(196, 168, 130, 0.05) 0%,
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
        /* App-market atmosphere — the ONLY layer behind the message column. A
           barely-there pool of the brand warmth top-left (where the headline
           sits) answered by an even fainter one bottom-right, so the cream
           isn't dead flat but nothing competes with the text or the panel.
           Static on purpose: the life in this hero belongs to the showcase
           panel. */
        .hero-ambient {
          background:
            radial-gradient(ellipse 50% 55% at 24% 32%,
              rgba(196, 168, 130, 0.13) 0%,
              rgba(196, 168, 130, 0.05) 45%,
              transparent 72%),
            radial-gradient(ellipse 45% 50% at 82% 78%,
              rgba(139, 96, 64, 0.06) 0%,
              transparent 65%);
          /* Fade the layer out before it reaches its own bounding box — the
             wash must never present an edge (an edge is a seam against the
             page, and seams are exactly what this hero removed). */
          -webkit-mask-image: radial-gradient(ellipse 90% 90% at 50% 48%,
            black 30%, transparent 95%);
          mask-image: radial-gradient(ellipse 90% 90% at 50% 48%,
            black 30%, transparent 95%);
        }
        :is(.dark) .hero-ambient {
          background:
            radial-gradient(ellipse 50% 55% at 24% 32%,
              rgba(196, 168, 130, 0.07) 0%,
              transparent 68%),
            radial-gradient(ellipse 45% 50% at 82% 78%,
              rgba(238, 197, 132, 0.03) 0%,
              transparent 62%);
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

      {/* Backdrop. App markets get one very subtle ambient gradient on the
          page ground and nothing else — the message column sits on clean
          space, and the contained showcase panel carries all the life. Non-app
          markets keep the lit atmospheric stage: mobile breaks out to the full
          viewport width via the left-1/2 / -translate-x-1/2 trick; from md up
          it becomes a framed panel inside the content column — rounded,
          hairline-bordered, one tonal step darker than the page. Either
          wrapper is aria-hidden decoration anchored to the <header>. */}
      {appShowcase ? (
        <div
          aria-hidden
          className="hero-ambient pointer-events-none absolute inset-0 z-0"
        />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen overflow-hidden z-0 md:left-0 md:right-0 md:w-auto md:translate-x-0 md:rounded-3xl md:border md:border-black/[0.08] md:bg-[#f1ede6] dark:md:border-white/[0.08] dark:md:bg-[oklch(19%_0.022_55)]"
        >
          {/* Order matters: warm floor sits behind so the shimmer + spotlight
              feel like they're cast on a surface; the vignette goes last so
              light falls off toward the corners. */}
          <div aria-hidden className="hero-warm-floor z-0" />
          <div aria-hidden className="hero-shimmer z-0" />
          <div aria-hidden className="hero-spotlight z-0" />
          <div
            aria-hidden
            className="hero-vignette z-[1] pointer-events-none"
          />

          {/* Mobile-only edge dissolves: the top fade melts into the navbar and
          the bottom fade resolves into the page colour, since the mobile
          stage is full-bleed with no frame of its own. From md up the framed
          panel's border IS the edge, so these fades switch off — a crisp
          boundary is the point of the frame. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 z-[6] bg-gradient-to-b from-[#f5f0e8] dark:from-background to-transparent md:hidden" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-56 z-[6] dark:hidden md:hidden"
            style={{
              background:
                "linear-gradient(to top, #f5f0e8 0%, rgba(245,240,232,0.94) 20%, rgba(245,240,232,0.58) 48%, rgba(245,240,232,0) 82%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-56 z-[6] hidden dark:block dark:md:hidden"
            style={{
              background:
                "linear-gradient(to top, var(--color-background, #15110d) 0%, rgba(21,17,13,0.85) 32%, rgba(21,17,13,0.4) 60%, transparent 100%)",
            }}
          />

          {/* Disclosure pulses — kept clear of the centre column (~40-60%)
            where the headline sits, and of the bottom fade. Sizes and
            delays vary so no two blips read as twins. */}
          {PULSE_POINTS.map((p) => (
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
          {MOBILE_PULSE_POINTS.map((p) => (
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
      )}

      <div
        className={`relative z-10 flex-1 flex flex-col px-4 md:px-10 md:py-16 ${
          hasTopNotice ? "pt-16 pb-3 md:pb-6" : "py-3 md:py-6"
        }`}
      >
        {appShowcase ? (
          <>
            {/* Desktop: message column (left) on clean page ground beside the
                contained showcase panel (right) — two layers that never
                overlap, so neither needs a scrim. The store CTA lives in the
                message column's button row, sized to its content. Two-column
                only once there's room (lg, or xl when a drawer is present). */}
            <div
              className={`m-auto ${twoColShow} w-full max-w-6xl items-center gap-10 xl:gap-14`}
            >
              <div className="flex-1">
                <div className="flex max-w-[560px] flex-col gap-6 text-left">
                  {headlineBlock}
                  {ctaRowDesktop}
                  {proofLine}
                </div>
              </div>
              <div className="w-[440px] shrink-0 xl:w-[480px]">
                <HeroDealShowcase radar={radar} />
              </div>
            </div>

            {/* Single column: notification scroller on top, then the centred
                headline. Used on mobile and on the mid-width desktop range
                before the two-column kicks in. On mobile the floating download
                bar handles installs; from md up (where that bar is hidden) the
                download CTA below stands in. */}
            <div
              className={`m-auto flex ${centeredHide} flex-col items-center gap-5 md:gap-7 text-center`}
            >
              {/* No logo on mobile — the stack is centred on its own. The cap
                  is above a phone's content width, so the card runs the full
                  column and only bounds itself on a tablet. */}
              <div className="w-full max-w-[400px]">
                <HeroNotificationStack deals={radar.deals} tick={radar.tick} />
              </div>
              {headlineBlock}
              <div className="hidden md:block">
                <StoreButtons
                  buttonClassName={`inline-flex items-center justify-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-6 py-3 text-base font-semibold shadow-md transition-[background-color,box-shadow] hover:shadow-lg`}
                  className="items-center sm:flex-row"
                  gaEvent="cta_hero_download_app"
                  gaLabel="Hero compact download"
                  marketId={marketId ?? "uk"}
                />
              </div>
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
