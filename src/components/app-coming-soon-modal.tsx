import { ChevronRightIcon } from "@heroicons/react/20/solid";

import { ModalDialog } from "@/components/app-modal";
import { AppWaitlistForm } from "@/components/discretion/eu-waitlist-overlay";
import {
  COMING_SOON_APPS,
  IOS_APP_LOGO_BY_MARKET,
  appHrefForMarket,
  downloadPagePathForMarketId,
} from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";

/** The UK and US apps, as the thing a visitor on an app-less market can have
 *  today. */
const LIVE_APPS = [
  { id: "uk", name: "ddbx UK", blurb: "UK director dealings" },
  { id: "us", name: "ddbx US", blurb: "US Form 4 and Congress trades" },
] as const;

/** What a "Download app" click opens on a market with no app of its own
 *  (COMING_SOON_APPS): the truth first ("The Sweden app is coming soon"),
 *  then the two apps that do exist, then a waitlist for this one.
 *
 *  Opens on phones too, unlike AppHandoffModal: there is no store listing for
 *  a tap to go to, and the old fallback — the UK app on Android, the market
 *  chooser elsewhere — installed a product the visitor hadn't asked for
 *  without saying so. */
export function AppComingSoonModal({
  open,
  onClose,
  marketId,
  placement,
}: {
  open: boolean;
  onClose: () => void;
  marketId: string;
  /** GA label for the clicks inside ("Sidebar nl"). */
  placement: string;
}) {
  const platform = useDevicePlatform();
  const isMobile = platform === "ios" || platform === "android";

  const name = COMING_SOON_APPS[marketId] ?? "This market’s";

  return (
    <ModalDialog
      align="sheet"
      className="max-h-[calc(100svh-2rem)] max-w-sm overflow-y-auto px-6 py-6"
      closeProps={{
        "data-ga-event": "cta_app_coming_soon_close",
        "data-ga-label": `App coming soon close · ${placement}`,
      }}
      label={`The ${name} app is coming soon`}
      open={open}
      onClose={onClose}
    >
      <div className="text-center">
        <img
          alt=""
          className="mx-auto h-16 w-16 rounded-card border border-black/10 shadow-lg dark:border-white/10"
          src="/ios-app-logo.svg"
        />
        <h2 className="mt-3 text-title">The {name} app is coming soon</h2>
        <p className="mt-1 text-sm text-muted">
          Why not download the UK or the US one?
        </p>
      </div>

      {/* Phones go straight to the store; a desktop has nothing to install
            onto, so it goes to that app's download page (QR, both stores). */}
      <ul className="mt-4 overflow-hidden rounded-card border border-rule">
        {LIVE_APPS.map((app) => {
          const href = isMobile
            ? appHrefForMarket(app.id, platform)
            : downloadPagePathForMarketId(app.id);
          const external = href.startsWith("http");

          return (
            <li key={app.id} className="border-b border-rule last:border-b-0">
              <a
                className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-black/3 dark:hover:bg-white/4"
                data-ga-event="cta_app_coming_soon_alt"
                data-ga-label={`${app.name} · ${placement}`}
                href={href}
                {...(external
                  ? { rel: "noopener noreferrer", target: "_blank" }
                  : { onClick: onClose })}
              >
                <img
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-control border border-black/10 dark:border-white/10"
                  src={IOS_APP_LOGO_BY_MARKET[app.id]}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {app.name}
                  </span>
                  <span className="block text-xs text-muted">{app.blurb}</span>
                </span>
                <ChevronRightIcon
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-muted"
                />
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 border-t border-rule pt-5 text-center">
        <AppWaitlistForm
          body={
            <>
              Want to know when the {name} app is out? Leave your email and
              we&rsquo;ll tell you.
            </>
          }
          doneText={
            <>
              You&rsquo;re on the list. We&rsquo;ll email you when the {name}{" "}
              app is out — nothing else, no newsletter.
            </>
          }
          marketId={marketId}
          submitLabel="Tell me when it’s out"
        />
      </div>
    </ModalDialog>
  );
}
