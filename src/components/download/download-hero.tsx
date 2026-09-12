/** Landing-page hero — the market hero's twin.
 *
 *  Two columns: the claim on the left, the live notification stack on the
 *  right, over the tick-synced `HeroLiveGradient`. It is deliberately the
 *  same object as `market/market-hero.tsx` so arriving here from a market
 *  page feels like the same room.
 *
 *  NOTHING IS WRAPPED AROUND THE STACK. It had a handset, then a static app
 *  screen behind it, then a bordered tonal panel with two mobile edge
 *  dissolves and a 7s float — three passes, all rejected on the same
 *  argument: the one genuinely live element on the page ends up reading as
 *  decoration inside a frame. Alone at full column width it reads as the
 *  product working. Screens keep their job in the scroll tour below.
 *
 *  Motion: the gradient, and only the gradient. It relocates on each advance
 *  of the radar clock, so the header's light moves when an alert lands — the
 *  one sanctioned atmosphere, because it is the stack's own clock made
 *  visible rather than a perpetual bob on a timer of its own
 *  (investigations/2026-08-30-design-language.md, tenet 4).
 *
 *  The figures live IN the message column as a dl, in the `StageFigures`
 *  form the boards use (mono key over a 26px figure) with light tokens, and
 *  they reserve their height while the feed is in flight. They used to be
 *  three cards under the hero that appeared from nothing when the fetch
 *  landed, which both jumped the page and cost a phone ~450px above the
 *  fold (static-page rules 2 and 6).
 */
import type { ReactNode } from "react";

import { StoreBadgeImg } from "@/components/app-store-badge";
import { BUTTON_GHOST, BUTTON_RADIUS } from "@/components/button";
import { CAPTION, EYEBROW } from "@/components/how-it-works/shared";
import { useDealRadar } from "@/components/market/hero-deal-radar";
import { HeroNotificationStack } from "@/components/market/hero-notification-stack";
import { HeroLiveGradient } from "@/components/market/market-hero";
import { Skeleton } from "@/components/skeleton";
import { STORE_LABEL, type AppPlatform } from "@/lib/app-screenshots";
import { useDownloadCopy } from "@/lib/download/copy";

/** One figure the page states about its own feed: a short mono key, the
 *  number, and the sentence that says what it counts (read by a screen
 *  reader, and printed in full in the FAQ — the visible dl has room for the
 *  key only). Every value is computed from the feed the page has already
 *  fetched; nothing here is ever typed in. */
export interface HeroFigure {
  k: string;
  value: number;
  label: string;
  suffix?: string;
}

/** The dl, in the boards' `StageFigures` form translated to light tokens.
 *  Centred under the claim on a phone, left-set from `lg` where the copy is.
 */
const DL =
  "mt-7 flex flex-wrap justify-center gap-x-10 gap-y-5 lg:justify-start lg:gap-x-12";
const DT =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/45";
const DD =
  "mt-1.5 text-[26px] font-medium leading-none tracking-[-0.02em] tabular-nums";

/** Two stand-in pairs on the real grid while the feed is in flight — the
 *  same device as `StageFigures reserve`. An empty box of the right height
 *  holds the geometry but reads as a gap; these say "numbers land here"
 *  without stating one. */
const RESERVED_PAIRS = 2;

function HeroFigures({
  figures,
  sourceLine,
  lang,
}: {
  figures: HeroFigure[] | null;
  sourceLine: string;
  lang: string;
}) {
  if (figures === null) {
    return (
      <div aria-hidden className={`${DL} h-[52px]`}>
        {Array.from({ length: RESERVED_PAIRS }, (_, i) => (
          <div key={i}>
            <Skeleton className="h-[11px] w-[52px]" />
            <Skeleton className="mt-1.5 h-[26px] w-[72px]" />
          </div>
        ))}
      </div>
    );
  }

  // A zero is a real number formatted into a claim about an empty set, so the
  // entry is omitted rather than stated. The caller already filters; this is
  // the guard that makes the rule hold wherever it is called from.
  const items = figures.filter((f) => f.value > 0);

  if (items.length === 0) return null;

  return (
    <>
      <dl className={DL}>
        {items.map((f) => (
          <div key={f.k}>
            <dt className={DT}>
              {f.k}
              {/* The full sentence ("director disclosures read in the last 30
                  days") has nowhere to sit in a dl this tight, but it is what
                  the figure MEANS — so it is read out rather than dropped. */}
              <span className="sr-only"> {f.label}</span>
            </dt>
            <dd className={DD}>
              {f.value.toLocaleString(lang)}
              {f.suffix ?? ""}
            </dd>
          </div>
        ))}
      </dl>
      {/* Provenance under the figures it belongs to — it was a stray line
          under three cards before. */}
      <p className={`mt-4 ${CAPTION}`}>{sourceLine}</p>
    </>
  );
}

export function DownloadHero({
  marketId,
  platform,
  headline,
  sub,
  storeHref,
  gaLabel,
  trialDays,
  /** The page's live figures, or `null` while the feed is in flight (the dl
   *  reserves its height rather than appearing from nothing). */
  figures,
  /** "Straight from SEC EDGAR" etc. — the provenance claim under the
   *  figures. */
  sourceLine,
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
  figures: HeroFigure[] | null;
  sourceLine: string;
  unavailableSlot?: ReactNode;
  altLocale?: { href: string; label: string; lang: string };
}) {
  const radar = useDealRadar(marketId, true);
  const t = useDownloadCopy();

  return (
    <header className="relative flex min-h-[62svh] flex-col lg:min-h-[600px]">
      {/* The header's only atmosphere, and its movement is the notification
          clock made visible. Full-bleed and masked at both edges by its own
          sheet, so it never presents a seam against the page — which is why
          there is no panel and no dissolve layer here any more. */}
      <HeroLiveGradient tick={radar.tick} />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 md:px-10 md:py-14 lg:grid-cols-[1fr_460px] lg:gap-14">
        {/* Copy is first in the DOM at every width — a screen reader and the tab
            order should meet the claim before the evidence for it — but on
            mobile the alert is painted above it (`order`). The stack is only
            ~200px tall, so unlike the full handset this column used to hold it
            doesn't push the headline below the fold; it lands as the first
            thing on screen, which is the one element that's actually live. */}
        <div className="order-2 text-center lg:order-1 lg:text-left">
          {/* The trial was a chip here. As the eyebrow it carries the same
              copy in the page's one eyebrow species, and stops the hero
              opening on a pill nothing else on the page wears. */}
          <p className={EYEBROW}>{t.trialChip(trialDays)}</p>

          <h1 className="mx-auto mt-5 max-w-[560px] text-balance text-[34px] font-semibold leading-[1.03] tracking-[-0.028em] lg:mx-0 lg:text-[58px]">
            {headline}
          </h1>
          <p className="mx-auto mt-5 max-w-[460px] text-balance text-base leading-relaxed text-foreground/65 lg:mx-0 lg:text-lg">
            {sub}
          </p>

          <HeroFigures
            figures={figures}
            lang={t.lang}
            sourceLine={sourceLine}
          />

          <div className="mt-8 flex flex-col items-center gap-3 lg:items-start">
            {/* Below `md` the layout's floating install bar is on screen, so a
                badge here is the same tap target twice — hidden from `sm` down.
                The "not on this store yet" block is NOT hidden: the floating
                bar falls back to a different app, and that needs explaining. */}
            {storeHref ? (
              <a
                aria-label={t.getOnStore(STORE_LABEL[platform])}
                className="hidden md:inline-block"
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

        {/* The live alert stack, bare. No handset, no screenshot, no panel,
            no float — see the file header for the three passes that
            established that. It leads on mobile (`order-1`) and runs the
            market hero's stack width on desktop (460px, the widest a
            notification reads as a banner rather than a toolbar). */}
        <div className="order-1 mx-auto w-full max-w-[360px] sm:max-w-[420px] lg:order-2 lg:max-w-none">
          <HeroNotificationStack deals={radar.deals} tick={radar.tick} />
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
