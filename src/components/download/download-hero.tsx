/** Landing-page hero — the market hero's card, with the landing page's claim.
 *
 *  ONE glass card split by a hairline: the claim on the left, the
 *  demonstration on the right — the alert landing, the price the director
 *  bought into drawing itself, the outcome stamping in on the bar beneath.
 *  It is `market/market-hero.tsx`'s exhibit exactly (`HeroShowcaseDemo`, the
 *  same `.hero-card` sheet), so arriving here from a market page is the same
 *  room, and the two halves read as one instrument: here's the claim, here's
 *  the proof. A bare stack beside the copy — the pass before this one — put
 *  a 460px alert in a half-page of empty cream and undersold both.
 *
 *  What differs from the market hero is only what's in the message half:
 *  the page's live figures sit under the standfirst as a dl in the boards'
 *  `StageFigures` form (light tokens, height reserved while the feed is in
 *  flight), and the CTA is the route's store rather than the device's.
 *
 *  Below `xl` — this page carries the fixed install rail, so the card has
 *  room only from there — it is the market hero's compact story: the alert
 *  with the outcome as a line of text beneath it, then the centred claim.
 *
 *  Motion: the gradient and the demo, both on the radar clock. Nothing on a
 *  timer of its own (investigations/2026-08-30-design-language.md, tenet 4).
 */
import type { ReactNode } from "react";
import type { AppPlatform } from "@/lib/app-screenshots";

import {
  BUTTON_FILLED,
  BUTTON_GHOST,
  BUTTON_RADIUS,
} from "@/components/button";
import { CAPTION, EYEBROW } from "@/components/how-it-works/shared";
import { useDealRadar } from "@/components/market/hero-deal-radar";
import {
  HeroLiveGradient,
  HeroShowcaseCompact,
  HeroShowcaseDemo,
} from "@/components/market/market-hero";
import { Skeleton } from "@/components/skeleton";
import { StoreButtons } from "@/components/store-buttons";
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
  "mt-6 flex flex-wrap justify-center gap-x-9 gap-y-4 xl:justify-start xl:gap-x-10";
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
      <p className={`mt-3 ${CAPTION}`}>{sourceLine}</p>
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

  // The message half. One node, mounted in the card from `xl` and in the
  // compact column below it — the two layouts differ in where it sits, not
  // in what it says.
  const message = (
    <div className="flex max-w-[560px] flex-col text-center xl:text-left">
      {/* The trial was a chip here. As the eyebrow it carries the same copy
          in the page's one eyebrow species, and stops the hero opening on a
          pill nothing else on the page wears. */}
      <p className={EYEBROW}>{t.trialChip(trialDays)}</p>

      {/* A step under the market hero's 64px: this page's claim is a full
          sentence rather than four words, and inside a card half it has to
          hold to four lines. */}
      <h1 className="mx-auto mt-4 text-balance text-[34px] font-semibold leading-[1.04] tracking-[-0.028em] sm:text-[40px] xl:mx-0 xl:text-[46px]">
        {headline}
      </h1>
      <p className="mx-auto mt-4 max-w-[460px] text-balance text-[16px] leading-relaxed text-foreground/65 xl:mx-0 xl:text-[17px]">
        {sub}
      </p>

      <HeroFigures figures={figures} lang={t.lang} sourceLine={sourceLine} />

      <div className="mt-7 flex flex-col items-center gap-3 xl:items-start">
        {/* Below `md` the layout's floating install bar is on screen, so a
            button here is the same tap target twice — hidden from `sm` down.
            The "not on this store yet" block is NOT hidden: the floating bar
            falls back to a different app, and that needs explaining. The
            button is the market hero's filled primary, sized to its content. */}
        {storeHref ? (
          <StoreButtons
            buttonClassName={`inline-flex items-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-6 py-3 text-base font-semibold shadow-md transition-[background-color,box-shadow] hover:shadow-lg`}
            className="hidden items-center md:flex xl:items-start"
            gaEvent="cta_download_lp"
            gaLabel={`${gaLabel} hero`}
            marketId={marketId}
            platform={platform}
          />
        ) : (
          unavailableSlot
        )}

        {/* The language switch. Deliberately a quiet text link under the CTA
            rather than a navbar control: it exists so a Hong Kong reader who
            lands on the English page (an ad, a shared link) can find their
            own, and so the two editions declare each other — but it must
            never compete with the install button above it. `hreflang` and
            `lang` so a crawler reads it as an alternate and a screen reader
            switches voice for the label, which is written in the language it
            links to. */}
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
  );

  return (
    <header className="relative flex min-h-[58svh] flex-col xl:min-h-[560px]">
      {/* The header's only atmosphere, and its movement is the notification
          clock made visible. It also carries the `.hero-card` sheet the card
          below is drawn with. */}
      <HeroLiveGradient tick={radar.tick} />

      <div className="relative z-10 flex flex-1 flex-col px-4 py-6 md:px-10 md:py-14">
        {/* The card, from `xl`. This page reserves the 320px install rail, so
            below that the card would squeeze the claim to a column; the
            market hero makes the same call with its news rail. Sized by
            CONTAINER width inside (`.hero-showcase`), so the chart drops out
            before it cramps. */}
        <div className="hero-showcase m-auto hidden w-full max-w-6xl xl:flex">
          <div className="hero-card">
            <div className="hero-card-msg">{message}</div>
            <HeroShowcaseDemo radar={radar} />
          </div>
        </div>

        {/* Single column below `xl`: the story on top — the alert, then the
            outcome as a line under it — and the claim beneath. Copy is second
            in paint order but the h1 is still the first heading in the
            document; the stack is what's live, so it leads the eye. */}
        <div className="m-auto flex w-full flex-col items-center gap-7 xl:hidden">
          <HeroShowcaseCompact radar={radar} />
          {message}
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
