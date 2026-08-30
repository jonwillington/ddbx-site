/** Landing-page hero.
 *
 *  A framed stage (same geometry as the market pages, so arriving here from
 *  one feels like the same room) with the live notification stack as the
 *  right column. The stage used to run the deal-radar basemap behind a left
 *  scrim; the map went site-wide on 2026-08-30 (contained it read as street
 *  noise, and a visual that needs a scrim is fighting its text — see
 *  investigations/2026-08-30-design-language.md), so the stage is now a
 *  quiet tonal panel and `useDealRadar` supplies only the clock + deals.
 *
 *  The right column is the live notification stack and nothing else — no
 *  handset, no app screenshot behind it. It briefly had both; the device was a
 *  frame the visitor had to look past, and the static screen behind the stack
 *  competed with it for the same glance, so the one genuinely live element on
 *  the page read as decoration on a picture. Alone and at full column width it
 *  reads as the product working. The screenshots keep their job in the scroll
 *  tour below.
 *
 *  Motion: the stack floats on a slow 7s cycle, and stops under
 *  prefers-reduced-motion.
 */
import type { ReactNode } from "react";

import { StoreBadgeImg } from "@/components/app-store-badge";
import { BUTTON_GHOST, BUTTON_RADIUS } from "@/components/button";
import { chip } from "@/components/chip";
import { useDealRadar } from "@/components/market/hero-deal-radar";
import { HeroNotificationStack } from "@/components/market/hero-notification-stack";
import { STORE_LABEL, type AppPlatform } from "@/lib/app-screenshots";
import { useDownloadCopy } from "@/lib/download/copy";

export function DownloadHero({
  marketId,
  platform,
  headline,
  sub,
  storeHref,
  gaLabel,
  trialDays,
  /** Rendered instead of the store badge when the app isn't installable on this
   *  platform yet (US on Google Play). */
  unavailableSlot,
  /** The same page in the other language. Omitted where there is no
   *  counterpart — the US pages have no Chinese edition. */
  altLocale,
}: {
  marketId: string;
  platform: AppPlatform;
  headline: ReactNode;
  sub: ReactNode;
  storeHref?: string;
  gaLabel: string;
  trialDays: number;
  unavailableSlot?: ReactNode;
  altLocale?: { href: string; label: string; lang: string };
}) {
  const radar = useDealRadar(marketId, true);
  const t = useDownloadCopy();

  return (
    <header className="relative flex min-h-[62svh] flex-col lg:min-h-[600px]">
      <style>{`
        @keyframes dlh-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        .dlh-float { animation: dlh-float 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .dlh-float { animation: none !important; }
        }
      `}</style>

      {/* Stage. Full-bleed on mobile via the left-1/2 break-out; a framed,
          hairline-bordered panel from md up — same geometry as the market
          hero, so arriving here from a market page feels like the same room. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2 overflow-hidden md:left-0 md:right-0 md:w-auto md:translate-x-0 md:rounded-3xl md:border md:border-black/[0.08] md:bg-[#f1ede6] dark:md:border-white/[0.08] dark:md:bg-[oklch(19%_0.022_55)]"
      >
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

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 md:px-10 md:py-14 lg:grid-cols-[1fr_420px] lg:gap-14">
        {/* Copy is first in the DOM at every width — a screen reader and the tab
            order should meet the claim before the evidence for it — but on
            mobile the alert is painted above it (`order`). The stack is only
            ~200px tall, so unlike the full handset this column used to hold it
            doesn't push the headline below the fold; it lands as the first
            thing on screen, which is the one element that's actually live. */}
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <span
              className={`${chip("lg")} bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/15 dark:text-brand-tan`}
            >
              {t.trialChip(trialDays)}
            </span>
          </div>

          <h1 className="mx-auto mt-5 max-w-[560px] text-balance text-[34px] font-semibold leading-[1.03] tracking-[-0.028em] lg:mx-0 lg:text-[58px]">
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
                aria-label={t.getOnStore(STORE_LABEL[platform])}
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

            {/* The language switch. Deliberately a quiet text link under the
                CTA rather than a navbar control: it exists so a Hong Kong
                reader who lands on the English page (an ad, a shared link) can
                find their own, and so the two editions declare each other —
                but it must never compete with the install button above it.
                `hreflang` and `lang` so a crawler reads it as an alternate and
                a screen reader switches voice for the label, which is written
                in the language it links to. */}
            {altLocale ? (
              <a
                className="mt-1 text-sm font-medium text-foreground/50 underline underline-offset-4 transition-colors hover:text-foreground/80"
                data-ga-event="cta_download_locale"
                data-ga-label={`${gaLabel} hero · ${altLocale.label}`}
                href={altLocale.href}
                hrefLang={altLocale.lang}
                lang={altLocale.lang}
              >
                {altLocale.label}
              </a>
            ) : null}
          </div>
        </div>

        {/* The live alert stack, on its own.
            There is no handset and no app screenshot here any more. A phone
            put a frame around the one element that's actually alive, and a
            static screenshot behind it competed with it for the same glance —
            the stack ended up reading as decoration layered on a picture.
            Standing alone at full column width it reads as what it is: real
            filings landing while you watch. Screens belong in the scroll tour
            below, where "four screens" genuinely wants a device.

            It leads on mobile (`order-1`) and takes the wider of the two
            columns on desktop: it is the only thing on the page that moves,
            and at 330px it was the smallest thing in the frame. */}
        <div className="order-1 mx-auto w-full max-w-[360px] sm:max-w-[420px] lg:order-2 lg:max-w-none">
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
    <div className="w-full max-w-[420px] rounded-2xl border border-hairline bg-white/70 p-5 text-left dark:border-border/60 dark:bg-surface-secondary/40">
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
