/** The conversion block at the foot of a company page.
 *
 *  A company page is an SEO landing surface: most of its traffic arrives cold
 *  from a search for one ticker, reads the table, and leaves. Everything above
 *  this answers their question. This is the only part of the page whose job is
 *  to make them want the app.
 *
 *  One beat, not three. It carried a live notification stack rebuilt from this
 *  company's own disclosures AND an auto-scrolling roller of seven app screens
 *  underneath it — two moving things and a device rail, all selling the same
 *  install, in a band a cold reader gives one glance. Every screen in the
 *  roller went past too small to read, and the alert stack repeated the
 *  disclosures the table further up the page already lists.
 *
 *  What is here now is the shape the rest of the site is being revamped to
 *  (investigations/2026-08-30-design-language.md): a dominant headline on
 *  clean ground, and one contained visual in a rounded hairline panel. The
 *  product shot does the showing; the headline does the asking.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { StoreButtons } from "@/components/store-buttons";
import { BUTTON_RADIUS } from "@/components/button";
import { FULL_BLEED } from "@/components/full-bleed";

export function CompanyAppPitch({
  company,
  ticker,
  deals,
  market,
}: {
  company: string;
  /** Display ticker, no exchange suffix. */
  ticker: string;
  deals: Array<Dealing | UsDealing>;
  market: string;
}) {
  const marketId = market === "UK" ? "uk" : "us";

  // A company page with no disclosures has nothing to promise alerts about,
  // so it doesn't ask. Same guard as before, read off the deals directly now
  // that the band doesn't rebuild them into alert copy.
  if (deals.length === 0) return null;

  return (
    // A dark band, not another cream one. Everything above this is the record
    // — cream sheets on a cream page — and the one block whose job is to sell
    // rather than inform was rendered in the same surface as all of it, so it
    // scrolled past as one more section. The change of surface IS the signal
    // that the page has stopped reporting and started asking.
    <section
      className={`${FULL_BLEED} mt-16 bg-ink text-white dark:bg-[oklch(17%_0.02_55)]`}
    >
      <div className="mx-auto max-w-[1280px] px-4 py-14 md:px-6 md:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* ---- Left: the ask, at poster size ----
              The headline is the loudest thing in the band on purpose. It used
              to sit at 40px beside an animating phone card, which meant the
              claim was the quiet half of its own pitch. */}
          <div>
            {/* 0.16em, the family kicker spec — `tracking-wider` is 0.05em and
                made this the one loose-tracked eyebrow on the site. */}
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-amber">
              The app
            </p>
            <h2 className="mt-5 max-w-[13ch] text-balance text-[40px] font-semibold leading-[1.0] tracking-[-0.03em] sm:text-[54px] lg:text-[62px] xl:text-[68px]">
              The next {company} buy lands on your phone.
            </h2>
            <p className="mt-6 max-w-[34em] text-[16px] leading-[1.6] text-white/60">
              Follow {ticker} and your phone buzzes the moment{" "}
              {market === "UK"
                ? "a director files with the LSE"
                : "an insider files a Form 4"}{" "}
              — rating, thesis and price history already attached.
            </p>

            <div className="mt-9 flex flex-col items-start gap-2.5">
              {/* Light fill: BUTTON_FILLED is near-black, which is the band. */}
              <StoreButtons
                buttonClassName={`inline-flex items-center gap-2.5 ${BUTTON_RADIUS} bg-white px-6 py-3.5 text-[15px] font-semibold text-ink shadow-sm transition-colors hover:bg-white/90`}
                className="items-start"
                gaEvent="cta_company_download"
                gaLabel={`Company pitch · ${ticker}`}
                glyphClassName="h-4 w-4 shrink-0"
                marketId={marketId}
              />
              <p className="text-[12.5px] text-white/50">
                Free for 7 days, cancel any time.
              </p>
            </div>
          </div>

          {/* ---- Right: one contained visual ----
              Contained-not-blended: a rounded hairline panel, no scrim and no
              fade into the band. The shot's own ground is the same near-black
              brown as the band, so the panel reads as a window cut into it
              rather than a card floating on it. `object-cover` at a fixed
              aspect keeps the handset centred at every width; intrinsic
              width/height so the row doesn't reflow when it decodes. */}
          <div className="overflow-hidden rounded-3xl border border-white/[0.09] bg-black/20">
            <img
              alt={`The ddbx ${marketId.toUpperCase()} app showing the week's insider buys`}
              className="aspect-[4/3] h-full w-full object-cover lg:aspect-[5/4]"
              decoding="async"
              height={1356}
              loading="lazy"
              src="/download-app.jpg"
              width={1600}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
