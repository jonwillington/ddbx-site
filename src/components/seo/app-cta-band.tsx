/** The terminal conversion block for the SEO page families.
 *
 *  These pages — the glossary, the sector hubs, the leaderboards, the report
 *  archive — exist to be found. That is their whole job: someone searches
 *  "what is a closed period", lands here, reads a good answer, and then hits
 *  a "Related" list of three plain links and the site footer. The page has
 *  nowhere to send them, which means the traffic it earns is spent.
 *
 *  This is the ask, and it is deliberately the same object as the company
 *  page's `CompanyAppPitch` — dark, amber mono kicker, white headline, one
 *  store button — because that band is the best-designed conversion surface on
 *  the site and a second visual language for "install the app" would just be a
 *  second thing to maintain. What is NOT shared is the per-company machinery
 *  (the live notification stack, the screen roller): those need a company's
 *  disclosures, and these pages don't have one.
 *
 *  Why a dark panel rather than another cream section: everything above it is
 *  the record — cream sheets on a cream page. The one block whose job is to
 *  sell rather than inform has to change surface, or it scrolls past as one
 *  more section.
 *
 *  CONTAINED, NOT FULL-BLEED. This ran edge-to-edge until now, which is what
 *  `CompanyAppPitch` itself used to do and stopped doing: a section that blows
 *  through the column all its neighbours respect is the opposite of what the
 *  design language asks for (investigations/2026-08-30-design-language.md,
 *  tenet 1), and on the SEO pages — which carry the fixed right rail — the
 *  dark stripe stopped dead against the rail's border. Held inside the column
 *  as one rounded object it reads as a card the page hands you rather than a
 *  band painted across it, and the two conversion surfaces are one recurring
 *  object again instead of two that merely share colours.
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

import { QrInstall } from "@/components/download/qr-install";
import { StoreButtons } from "@/components/store-buttons";
import { BUTTON_RADIUS } from "@/components/button";
import { storeUrlForMarketId } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";

export type CtaMedia = "screenshot" | "qr" | "none";

export function AppCtaBand({
  kicker = "The app",
  headline,
  body,
  gaLabel,
  marketId,
  media = "screenshot",
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
  className?: string;
}) {
  const platform = useDevicePlatform();
  const qrUrl = storeUrlForMarketId(marketId, platform);
  // A QR code on the device you'd scan it with is a mirror. On touch, the
  // store button below is the path, so the column simply isn't rendered.
  const showQr =
    media === "qr" && !!qrUrl && platform !== "ios" && platform !== "android";
  const showShot = media === "screenshot";
  const hasMedia = showQr || showShot;

  return (
    <section
      className={`mt-16 overflow-hidden rounded-[28px] bg-ink text-white dark:bg-[oklch(17%_0.02_55)] ${className}`}
    >
      <div className="px-6 py-14 sm:px-10 md:px-14 md:py-16">
        <div
          className={
            hasMedia ? "grid items-center gap-12 lg:grid-cols-2 lg:gap-16" : ""
          }
        >
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-amber">
              {kicker}
            </p>
            {/* Sized for a contained panel, not a full-bleed band: the old
                40px was set against the page's full width and reads as a
                headline shouting in a small room once the panel is held
                inside the column. Same scale as CompanyAppPitch's h2. */}
            <p className="mt-3 text-balance text-[30px] font-semibold leading-[1.05] tracking-[-0.028em] sm:text-[38px] lg:text-[42px]">
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
            // The same product photo CompanyAppPitch leads with, in the same
            // window-cut-into-the-band treatment: a rounded hairline panel,
            // no scrim, the shot's own near-black ground reading as part of
            // the band. It replaced the framed simulator capture so the two
            // conversion surfaces show one photo rather than two vintages of
            // the app.
            //
            // Desktop only, unchanged: on mobile the stacked column would put
            // the photo BELOW the store buttons — a picture of the app under
            // the button that installs it, pushing the fold for nothing.
            <div className="hidden overflow-hidden rounded-3xl border border-white/[0.09] bg-black/20 lg:block">
              <img
                alt={`The ddbx ${marketId.toUpperCase()} app showing the week's insider buys`}
                className="aspect-[5/4] h-full w-full object-cover"
                decoding="async"
                height={1356}
                loading="lazy"
                src="/download-app.jpg"
                width={1600}
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
