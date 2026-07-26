/** Landing-page hero.
 *
 *  The old one was a headline over a single static radial gradient — visibly
 *  weaker than the market pages we send people *from*. This one is built on the
 *  same lit stage the market hero uses: the live deal-radar map behind a framed
 *  panel, a wash from the left so the headline stays legible over it, and a
 *  warm spotlight pooled where the copy sits. `HeroDealMapLayer` and
 *  `useDealRadar` are imported directly rather than re-implemented, so the map
 *  is literally the same instrument, driven by the same clock.
 *
 *  The right column is the live notification stack and nothing else — no
 *  handset, no app screenshot behind it. It briefly had both; the device was a
 *  frame the visitor had to look past, and the static screen behind the stack
 *  competed with it for the same glance, so the one genuinely live element on
 *  the page read as decoration on a picture. Alone and at full column width it
 *  reads as the product working. The screenshots keep their job in the scroll
 *  tour below.
 *
 *  Motion: the stage breathes (shared with the market hero), the stack floats
 *  on a slow 7s cycle, and both stop under prefers-reduced-motion.
 */
import type { ReactNode } from "react";

import { StoreBadgeImg } from "@/components/app-store-badge";
import { BUTTON_GHOST, BUTTON_RADIUS } from "@/components/button";
import { chip } from "@/components/chip";
import {
  HeroDealMapLayer,
  useDealRadar,
} from "@/components/market/hero-deal-radar";
import { HeroNotificationStack } from "@/components/market/hero-notification-stack";
import { STORE_LABEL, type AppPlatform } from "@/lib/app-screenshots";

export function DownloadHero({
  marketId,
  platform,
  headline,
  sub,
  storeHref,
  gaLabel,
  trialDays,
  /** Live filings count for the proof line; 0 falls back to a "watching" state
   *  so the line never blinks out and leaves a hole under the CTA. */
  todayCount = 0,
  /** Rendered instead of the store badge when the app isn't installable on this
   *  platform yet (US on Google Play). */
  unavailableSlot,
}: {
  marketId: string;
  platform: AppPlatform;
  headline: ReactNode;
  sub: ReactNode;
  storeHref?: string;
  gaLabel: string;
  trialDays: number;
  todayCount?: number;
  unavailableSlot?: ReactNode;
}) {
  const radar = useDealRadar(marketId, true);

  return (
    <header className="relative flex min-h-[62svh] flex-col lg:min-h-[600px]">
      <style>{`
        @keyframes dlh-breathe {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.04); }
        }
        @keyframes dlh-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        /* Wash entering from the left edge, gone by the time it reaches the
           device — keeps the headline legible over the panning basemap and
           melts the map's left edge into the stage. Themed to the panel base,
           not the page: the frame only exists from md up. */
        .dlh-scrim {
          background: linear-gradient(to right,
            #f1ede6 0%,
            rgba(241, 237, 230, 0.97) 16%,
            rgba(241, 237, 230, 0.5) 38%,
            transparent 58%);
        }
        :is(.dark) .dlh-scrim {
          background: linear-gradient(to right,
            oklch(19% 0.022 55) 0%,
            oklch(19% 0.022 55 / 0.97) 16%,
            oklch(19% 0.022 55 / 0.5) 38%,
            transparent 58%);
        }
        .dlh-spot {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 46% 60% at 26% 42%,
            rgba(255, 248, 232, 0.9) 0%,
            rgba(255, 248, 232, 0.5) 30%,
            rgba(255, 249, 235, 0.14) 55%,
            transparent 72%);
          will-change: opacity, transform;
          animation: dlh-breathe 9s ease-in-out infinite;
        }
        :is(.dark) .dlh-spot {
          background: radial-gradient(ellipse 46% 60% at 26% 42%,
            rgba(196, 168, 130, 0.16) 0%,
            rgba(196, 168, 130, 0.08) 30%,
            transparent 72%);
        }
        .dlh-float { animation: dlh-float 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .dlh-spot, .dlh-float { animation: none !important; }
        }
      `}</style>

      {/* Stage. Full-bleed on mobile via the left-1/2 break-out; a framed,
          hairline-bordered panel from md up — same geometry as the market
          hero, so arriving here from a market page feels like the same room. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2 overflow-hidden md:left-0 md:right-0 md:w-auto md:translate-x-0 md:rounded-3xl md:border md:border-black/[0.08] md:bg-[#f1ede6] dark:md:border-white/[0.08] dark:md:bg-[oklch(19%_0.022_55)]"
      >
        <div className="absolute inset-0 z-0 hidden md:block">
          <HeroDealMapLayer
            activeIndex={radar.activeIndex}
            deals={radar.deals}
            isDark={radar.isDark}
            mapConfig={radar.mapConfig}
          />
        </div>
        <div className="dlh-scrim absolute inset-0 z-[5] hidden md:block" />
        <div className="dlh-spot z-[5] hidden md:block" />

        {/* Mobile edge dissolves — no frame there, so the stage has to melt
            into the navbar above and the page below. */}
        <div className="absolute inset-x-0 top-0 z-[6] h-20 bg-gradient-to-b from-[#f5f0e8] to-transparent dark:from-background md:hidden" />
        <div
          className="absolute inset-x-0 bottom-0 z-[6] h-40 dark:hidden md:hidden"
          style={{
            background:
              "linear-gradient(to top, #f5f0e8 0%, rgba(245,240,232,0.9) 30%, rgba(245,240,232,0) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 z-[6] hidden h-40 dark:block dark:md:hidden"
          style={{
            background:
              "linear-gradient(to top, var(--color-background, #15110d) 0%, rgba(21,17,13,0.8) 34%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 md:px-10 md:py-14 lg:grid-cols-[1fr_330px] lg:gap-14">
        {/* Copy leads at every width. A full phone is ~640px tall on a 390px
            screen, so leading with the device on mobile pushed the headline
            entirely below the fold — the first thing a visitor saw was a
            handset with no claim attached to it. */}
        <div className="text-center lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <span
              className={`${chip("lg")} bg-[#5a4128]/10 text-[#5a4128] dark:bg-[#ad9479]/15 dark:text-[#ad9479]`}
            >
              {trialDays}-day free trial · Cancel anytime
            </span>
          </div>

          <h1 className="mx-auto mt-5 max-w-[560px] text-balance text-[34px] font-semibold leading-[1.05] tracking-tight lg:mx-0 lg:text-[54px]">
            {headline}
          </h1>
          <p className="mx-auto mt-5 max-w-[460px] text-balance text-base leading-relaxed text-foreground/65 lg:mx-0 lg:text-lg">
            {sub}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 lg:items-start">
            {/* Below `md` the layout's floating install bar is on screen, so a
                badge here is the same tap target twice — hidden from `sm` down.
                The "not on this store yet" block is NOT hidden: the floating
                bar falls back to a different app, and that needs explaining. */}
            {storeHref ? (
              <a
                aria-label={`Get ddbx on the ${STORE_LABEL[platform]}`}
                className="dl-lift hidden md:inline-block"
                data-ga-event="cta_download_lp"
                data-ga-label={`${gaLabel} hero · ${platform}`}
                href={storeHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <StoreBadgeImg size="lg" store={platform} />
              </a>
            ) : (
              unavailableSlot
            )}

            {/* Live proof, straight under the CTA: the headline makes a claim,
                this shows we're delivering on it right now. */}
            <p className="flex items-center gap-2 text-sm text-foreground/55">
              <span aria-hidden className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22a06b] opacity-50 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22a06b]" />
              </span>
              {todayCount > 0
                ? `${todayCount} filing${todayCount === 1 ? "" : "s"} so far today`
                : "Live · watching today’s filings as they land"}
            </p>
          </div>
        </div>

        {/* The live alert stack, on its own.
            There is no handset and no app screenshot here any more. A phone
            put a frame around the one element that's actually alive, and a
            static screenshot behind it competed with it for the same glance —
            the stack ended up reading as decoration layered on a picture.
            Standing alone at full column width it reads as what it is: real
            filings landing while you watch. Screens belong in the scroll tour
            below, where "four screens" genuinely wants a device. */}
        <div className="mx-auto w-full max-w-[330px] sm:max-w-[360px] lg:max-w-none">
          <div className="dlh-float relative">
            <HeroNotificationStack deals={radar.deals} tick={radar.tick} />
          </div>
        </div>
      </div>
    </header>
  );
}

/** The "you can't install this yet" block, used where a market/platform pair
 *  has no live store listing. Never a dead end: it always offers the two real
 *  things the visitor CAN install right now. */
export function StoreUnavailable({
  message,
  alternatives,
}: {
  message: string;
  alternatives: { label: string; href: string; gaLabel: string }[];
}) {
  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-[#e0d8cc] bg-white/70 p-5 text-left dark:border-border/60 dark:bg-surface-secondary/40">
      <p className="text-sm leading-relaxed text-foreground/70">{message}</p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {alternatives.map((a) => (
          <a
            key={a.href}
            className={`inline-flex items-center ${BUTTON_RADIUS} ${BUTTON_GHOST} px-4 py-2 text-sm font-medium transition-colors`}
            data-ga-event="cta_download_lp_alt"
            data-ga-label={a.gaLabel}
            href={a.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {a.label}
          </a>
        ))}
      </div>
    </div>
  );
}
