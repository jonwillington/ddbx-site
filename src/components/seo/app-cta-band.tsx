/** The terminal conversion block for the SEO page families.
 *
 *  These pages — the glossary, the sector hubs, the leaderboards, the report
 *  archive — exist to be found. That is their whole job: someone searches
 *  "what is a closed period", lands here, reads a good answer, and then hits
 *  a "Related" list of three plain links and the site footer. The page has
 *  nowhere to send them, which means the traffic it earns is spent.
 *
 *  This is the ask. It is deliberately the same object as the company page's
 *  `CompanyAppPitch` band — full-bleed, dark, amber mono kicker, white
 *  headline, one store button — because that band is already the best-designed
 *  conversion surface on the site and a second visual language for "install the
 *  app" would just be a second thing to maintain. What is NOT shared is the
 *  per-company machinery (the live notification stack, the screen roller):
 *  those need a company's disclosures, and these pages don't have one.
 *
 *  Why a dark band rather than another cream section: everything above it is
 *  the record — cream sheets on a cream page. The one block whose job is to
 *  sell rather than inform has to change surface, or it scrolls past as one
 *  more section. Same reasoning as `CompanyAppPitch`, same colours, so the two
 *  read as one recurring object across the site.
 *
 *  Placement rule: after the last content section, BEFORE any methodology or
 *  small-print footnote. Small print reads as the caption of the whole page and
 *  belongs at the true bottom.
 *
 *  SEO note: the headline is a `<p>`, not a heading. These pages rank on their
 *  own content, and injecting a second h2-level "Get the app" into every
 *  document's outline dilutes the heading structure that earned the ranking.
 */
import type { ReactNode } from "react";

import { DeviceFrame } from "@/components/download/device-frame";
import { QrInstall } from "@/components/download/qr-install";
import { StoreButtons } from "@/components/store-buttons";
import { BUTTON_RADIUS } from "@/components/button";
import { FULL_BLEED } from "@/components/full-bleed";
import { storeUrlForMarketId } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";
import { appShotSrc, SLOT_LABEL, type ShotSlot } from "@/lib/app-screenshots";

export type CtaMedia = "screenshot" | "qr" | "none";

export function AppCtaBand({
  kicker = "The app",
  headline,
  body,
  gaLabel,
  marketId,
  media = "screenshot",
  screenshotSlot = "analysis",
  className = "",
}: {
  kicker?: string;
  headline: ReactNode;
  body: ReactNode;
  /** Distinguishes which SEO family drove the install in GA. */
  gaLabel: string;
  marketId: "uk" | "us";
  /** Right-hand column. "none" gives a single centred measure — used on the
   *  broker guides, where an affiliate CTA is already competing for the click
   *  and a phone next to it is two asks in one band. */
  media?: CtaMedia;
  /** Defaults to `analysis`, deliberately NOT `today`: the today captures are
   *  whatever state the simulator was in, and the current ones were taken at a
   *  weekend — so "Follow these insiders in real time" rendered next to a
   *  "Markets closed for the weekend" empty state. Pick a slot whose screen
   *  always has content in it. */
  screenshotSlot?: ShotSlot;
  className?: string;
}) {
  const platform = useDevicePlatform();
  const qrUrl = storeUrlForMarketId(marketId, platform);
  // A QR code on the device you'd scan it with is a mirror. On touch, the
  // store button below is the path, so the column simply isn't rendered.
  const showQr =
    media === "qr" && !!qrUrl && platform !== "ios" && platform !== "android";
  const framePlatform = platform === "android" ? "android" : "ios";
  const showShot = media === "screenshot";
  const hasMedia = showQr || showShot;

  return (
    <section
      className={`${FULL_BLEED} mt-16 bg-ink text-white dark:bg-[oklch(17%_0.02_55)] ${className}`}
    >
      <div className="mx-auto max-w-[1280px] px-4 py-14 md:px-6 md:py-20">
        <div
          className={
            hasMedia
              ? "grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16"
              : ""
          }
        >
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-amber">
              {kicker}
            </p>
            <p className="mt-3 text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[40px]">
              {headline}
            </p>
            <p className="mt-4 max-w-[36em] text-[16px] leading-[1.6] text-white/65">
              {body}
            </p>

            <div className="mt-8 flex flex-col items-start gap-2.5">
              {/* Light fill: BUTTON_FILLED is near-black, which is the band. */}
              <StoreButtons
                buttonClassName={`inline-flex items-center gap-2.5 ${BUTTON_RADIUS} bg-white px-6 py-3.5 text-[15px] font-semibold text-ink shadow-sm transition-colors hover:bg-white/90`}
                className="items-start"
                gaEvent="cta_seo_band"
                gaLabel={gaLabel}
                marketId={marketId}
              />
              <p className="text-[12.5px] text-white/50">
                Free for 7 days, cancel any time.
              </p>
            </div>
          </div>

          {showShot ? (
            // Desktop only: on mobile the stacked column would put a 240px
            // device frame BELOW the store buttons — a screenshot of the app
            // under the button that installs it, pushing the fold for nothing.
            <div className="hidden w-full max-w-[240px] lg:block">
              <DeviceFrame
                alt={`ddbx ${SLOT_LABEL[screenshotSlot]} screen`}
                platform={framePlatform}
                slot={screenshotSlot}
                src={appShotSrc(marketId, framePlatform, screenshotSlot)}
              />
            </div>
          ) : null}

          {showQr ? (
            <div className="flex justify-center lg:justify-end">
              <QrInstall
                caption="Scan to install on your phone"
                captionClassName="text-white/50"
                url={qrUrl as string}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
