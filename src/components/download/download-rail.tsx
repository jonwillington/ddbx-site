// The fixed right rail for the /download family.
//
// Every other page in the section carries one — the record pages take
// `BrokerAside`, the article pages take `SeoRail` — and the install landing
// pages were the last surface sitting at the full 1280px column, so arriving
// here from /sectors or /learn shunted the page 320px sideways.
//
// What goes in it is not the broker directory: this page's single ask is the
// install, and a rail selling platforms would compete with the thing the whole
// page exists to do. It's the ask itself, held on screen — the desktop twin of
// the floating download CTA `DefaultLayout` already renders on mobile. The
// hero's store button scrolls away after the first screen and the next one
// isn't until the closing band; this covers the four sections in between.
//
// The shell (fixed, w-80, bordered, h-16 header) is copied from
// `components/seo/seo-rail.tsx` on purpose — all the rails have to agree on
// their width and header height or `drawerRight`'s `lg:mr-80` gutter and the
// navbar's alignment stop matching.

import type { AppPlatform } from "@/lib/app-screenshots";

import { BUTTON_RADIUS } from "@/components/button";
import { StoreButtons } from "@/components/store-buttons";
import { IOS_APP_LOGO_BY_MARKET } from "@/lib/app-store";
import { useDownloadCopy } from "@/lib/download/copy";
import { annualPerMonth, formatPrice, PRICING } from "@/lib/pricing";

export function DownloadRail({
  marketId,
  gaLabel,
  platform,
}: {
  marketId: "uk" | "us";
  /** GA label, so rail installs can be told apart from the hero and the
   *  closing band. Callers pass the page's `cfg.gaPrefix`. */
  gaLabel: string;
  /** The route's platform, not the device's — /download/android must show a
   *  Google Play button even to a desktop visitor, who sniffs as neither. */
  platform: AppPlatform;
}) {
  const pricing = PRICING[marketId];
  const t = useDownloadCopy();
  const latestFilings = marketId === "us" ? "/us" : "/";
  // Onward paths out of the landing page. It has none today short of the
  // navbar — a reader who isn't ready to install has to leave rather than
  // browse. The destinations themselves are English-only pages, so these are
  // translated labels on English content: a Chinese reader who follows one
  // knows what they clicked, which is better than a dead end in the rail.
  const onward: [label: string, href: string][] = [
    [t.railLinks.latestFilings, latestFilings],
    [t.railLinks.companies, "/companies"],
    [t.railLinks.sectors, "/sectors"],
    [t.railLinks.biggestBuys, "/biggest-buys"],
    [t.railLinks.glossary, "/learn"],
  ];

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-20 hidden w-80 flex-col border-l border-hairline bg-sheet dark:border-separator dark:bg-surface lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-hairline px-4 dark:border-separator">
        <img
          alt=""
          className="h-7 w-7 rounded-md"
          height={28}
          src={IOS_APP_LOGO_BY_MARKET[marketId]}
          width={28}
        />
        <h2 className="text-sm font-semibold text-foreground/80">
          ddbx {marketId.toUpperCase()}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="rounded-xl border border-hairline bg-background/40 p-4 dark:border-separator">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
            {t.railFreeForDays(pricing.trialDays)}
          </p>
          <p className="mt-2 text-[22px] font-semibold leading-none tracking-[-0.02em] text-foreground">
            {formatPrice(pricing, annualPerMonth(pricing))}
            <span className="text-[13px] font-normal text-foreground/55">
              {" "}
              {t.railPerMonth}
            </span>
          </p>
          <p className="mt-1.5 text-xs leading-[1.6] text-foreground/55">
            {t.railBilled(
              formatPrice(pricing, pricing.annual),
              formatPrice(pricing, pricing.monthly),
            )}
          </p>

          <StoreButtons
            buttonClassName={`inline-flex w-full items-center justify-center gap-2 ${BUTTON_RADIUS} bg-ink px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#2a2118] dark:bg-white dark:text-ink dark:hover:bg-white/90`}
            className="mt-4"
            gaEvent="cta_download_rail"
            gaLabel={gaLabel}
            marketId={marketId}
            platform={platform}
          />
        </div>

        <ul className="mt-4 space-y-0.5">
          {onward.map(([label, href]) => (
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
