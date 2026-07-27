import { BUTTON_RADIUS } from "@/components/button";
import { StoreButtons } from "@/components/store-buttons";
import { BrokerAside } from "@/components/brokers/broker-aside";

/** The fixed right rail for the SEO page family (glossary, sector hubs,
 *  leaderboards, report archive, broker guides).
 *
 *  Those pages shipped without one, so they sat at the full 1280px column while
 *  every page they link to — /companies, /company/:key, /brokers/:slug — sits
 *  320px narrower. Clicking through from a sector hub to a company shunted the
 *  whole page sideways, and the SEO pages were also the only surfaces in the
 *  section carrying no persistent promo at all: their one ask was the
 *  AppCtaBand at the very bottom, which a reader who bounces mid-article never
 *  reaches.
 *
 *  Market matters here. `BrokerAside` self-loads `api.brokers("UK")` and the
 *  affiliate directory is UK-only editorial (the navbar gates /brokers to
 *  market.id === "uk" for exactly this reason), so dropping it onto ddbx.us
 *  would fill the rail with platforms a US reader can't use. US pages get the
 *  app instead — which is the stronger ask there anyway, since there's no
 *  affiliate revenue to compete with it.
 *
 *  Pair with `<DefaultLayout drawerRight>`; that reserves the lg:mr-80 gutter
 *  and tells the cookie banner to step aside (see lib/rail-presence.ts).
 */
export function SeoRail({
  marketId,
  ukHeading = "Start investing",
  placement,
}: {
  /** Any market id. Only `"uk"` selects the affiliate directory; everything
   *  else gets the app rail, whose StoreButtons already fall back to the UK
   *  app for markets with no store listing of their own (SE, NL). Widened from
   *  `"uk" | "us"` when /directors/:id joined the family — that route serves
   *  four markets, and coercing SE to "us" would have put the US app in a
   *  Swedish reader's rail. */
  marketId: string;
  /** Header for the UK (broker) rail only. Named for its branch rather than
   *  called `heading`, because the two rails are selling different things: a
   *  broker-flavoured "Start investing" sitting above an App Store button
   *  reads as a mistake. The app rail owns its own heading below. */
  ukHeading?: string;
  /** GA label, so rail conversions can be told apart from the closing band. */
  placement: string;
}) {
  if (marketId === "uk") {
    return (
      <BrokerAside
        showAll
        // Grey, not primary: these pages spend their filled button on the
        // AppCtaBand at the foot. Three near-black CTAs in one viewport means
        // the page has no primary action at all.
        ctaVariant="grey"
        heading={ukHeading}
        placement={placement}
      />
    );
  }

  return <AppPromoAside marketId={marketId} placement={placement} />;
}

/** Non-UK rail: the app, since there's no affiliate directory for the market.
 *  Same fixed shell as BrokerAside so the two are interchangeable and the
 *  gutter maths doesn't change. */
function AppPromoAside({
  marketId,
  placement,
}: {
  marketId: string;
  placement: string;
}) {
  return (
    <aside className="fixed bottom-0 right-0 top-0 z-20 hidden w-80 flex-col border-l border-[#e8e0d5] bg-[#faf7f2] dark:border-separator dark:bg-surface lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-[#e8e0d5] px-4 dark:border-separator">
        <h2 className="text-sm font-semibold text-foreground/80">
          Get the app
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="rounded-xl border border-[#e8e0d5] bg-background/40 p-4 dark:border-separator">
          <p className="text-[13px] font-semibold text-foreground">
            Every filing, the day it files
          </p>
          <p className="mt-2 text-xs leading-[1.6] text-foreground/55">
            This page is a snapshot. The app tracks each disclosure as it lands
            — rated, argued both ways, with the price history already attached.
          </p>

          <StoreButtons
            buttonClassName={`inline-flex w-full items-center justify-center gap-2 ${BUTTON_RADIUS} bg-[#1a140d] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#2a2118] dark:bg-white dark:text-[#1a140d] dark:hover:bg-white/90`}
            className="mt-4"
            gaEvent="cta_seo_rail"
            gaLabel={placement}
            marketId={marketId}
          />
          <p className="mt-2.5 text-[11px] text-foreground/45">
            Free for 7 days, cancel any time.
          </p>
        </div>

        <ul className="mt-4 space-y-0.5">
          {[
            ["Latest filings", "/us"],
            ["Companies", "/companies"],
            ["Sectors", "/sectors"],
            ["Biggest buys", "/biggest-buys"],
            ["Glossary", "/learn"],
          ].map(([label, href]) => (
            <li key={href}>
              <a
                className="block rounded-lg px-2 py-2 text-[13px] font-medium text-foreground/70 transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]"
                href={href}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
