import { useCallback, useState } from "react";

import { ModalDialog } from "@/components/app-modal";
import { QrInstall } from "@/components/download/qr-install";
import { StoreBadges } from "@/components/app-store-badge";
import { AppComingSoonModal } from "@/components/app-coming-soon-modal";
import {
  COMING_SOON_APPS,
  IOS_APP_LOGO_BY_MARKET,
  appStoreUrlForMarketId,
} from "@/lib/app-store";
import { PRICING, formatPrice } from "@/lib/pricing";
import { useDevicePlatform } from "@/lib/use-device-platform";

/** Desktop intermediary between a "get the app" click and the store.
 *
 *  A desktop click on a store link used to land on a cold App Store page —
 *  the one surface we don't control, reached from the one device that can't
 *  install from it. This modal is the beat in between (same pattern as the
 *  performance rail's month-unlock): the market's app icon, the pitch in one
 *  breath, honest trial terms, a QR for the phone in their pocket, and both
 *  store choices.
 *
 *  Desktop-only by design: on iOS/Android the tap can install directly, so
 *  callers keep linking straight to the store there (`useAppHandoff` hands
 *  back the plain href in that case).
 */
const BENEFITS = [
  "Every disclosure, pushed the day it files",
  "The full analysis behind every rated buy",
  "Track every insider’s record over time",
];

export function AppHandoffModal({
  open,
  onClose,
  marketId,
  placement,
}: {
  open: boolean;
  onClose: () => void;
  /** Market whose app is being sold — picks icon, store links, pricing. */
  marketId: string;
  /** GA label for the badges inside ("Navbar handoff"). */
  placement: string;
}) {
  const pricing =
    PRICING[marketId === "us" || marketId === "usg" ? "us" : "uk"];
  const qrUrl = appStoreUrlForMarketId(marketId === "usg" ? "us" : marketId);
  const icon =
    IOS_APP_LOGO_BY_MARKET[marketId === "usg" ? "us" : marketId] ??
    "/ios-app-logo.svg";

  return (
    <ModalDialog
      className="max-w-sm px-6 py-6 text-center"
      closeProps={{
        "data-ga-event": "cta_app_handoff_close",
        "data-ga-label": `App handoff close · ${placement}`,
      }}
      label="Get the ddbx app"
      open={open}
      onClose={onClose}
    >
      <img
        alt=""
        className="mx-auto h-16 w-16 rounded-card border border-black/10 shadow-lg dark:border-white/10"
        src={icon}
      />
      <h2 className="mt-3 text-title">Get the ddbx app</h2>
      <ul className="mx-auto mt-3 max-w-[17rem] space-y-1.5 text-left text-sm">
        {BENEFITS.map((line) => (
          <li key={line} className="flex items-start gap-2 text-foreground/80">
            <span className="mt-0.5 text-brand-brown dark:text-brand-tan">
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {qrUrl ? (
        <div className="mt-5 flex justify-center">
          <QrInstall caption="Scan with your phone to install" url={qrUrl} />
        </div>
      ) : null}

      <StoreBadges
        className="mt-5 justify-center"
        marketId={marketId}
        placement={placement}
        size="md"
      />
      <p className="mt-3 text-caption text-muted/70">
        Free for {pricing.trialDays} days, then{" "}
        {formatPrice(pricing, pricing.monthly)}/month
        {pricing.promotional ? " while the promotion runs" : ""}. Cancel any
        time.
      </p>
    </ModalDialog>
  );
}

/** Props a store-bound anchor spreads to join the handoff flow.
 *
 *  `data-ga-store-intercepted` is what tells the GA click tracker that this
 *  anchor's store href is decorative — see the note on the desktop branch of
 *  `useAppHandoff`. It ships as one object precisely so a caller can't wire
 *  up `href` + `onClick` and quietly leave the marker off.
 */
export interface AppHandoffAnchorProps {
  href: string;
  onClick?: (e: React.MouseEvent) => void;
  "data-ga-store-intercepted"?: "true";
}

/** Turns a direct store CTA into the handoff flow on desktop only.
 *
 *  Spread `anchorProps` onto the store-bound anchor: on iOS/Android the
 *  original href passes through untouched (the tap installs); on desktop the
 *  click is intercepted and the modal opens instead. Mount `modal` once,
 *  anywhere in the same tree.
 */
export function useAppHandoff(
  marketId: string,
  href: string,
  placement: string,
): {
  anchorProps: AppHandoffAnchorProps;
  modal: React.ReactNode;
} {
  const platform = useDevicePlatform();
  const [open, setOpen] = useState(false);
  const isMobile = platform === "ios" || platform === "android";

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setOpen(true);
    },
    [setOpen],
  );

  // A market with no app of its own (COMING_SOON_APPS) has no listing for the
  // click to reach on any device, so phones are intercepted too and every
  // platform gets the coming-soon modal: the UK/US apps, and a waitlist.
  if (COMING_SOON_APPS[marketId]) {
    return {
      anchorProps: { href, onClick, "data-ga-store-intercepted": "true" },
      modal: (
        <AppComingSoonModal
          marketId={marketId}
          open={open}
          placement={placement}
          onClose={() => setOpen(false)}
        />
      ),
    };
  }

  if (isMobile) {
    return { anchorProps: { href }, modal: null };
  }

  return {
    // The href stays a real store URL (open-in-new-tab, crawlers, copy-link),
    // but this click never leaves the site — it opens the modal. Without the
    // marker the delegated tracker in lib/cookie-consent.ts sees a store
    // destination and counts a `store_click` for a desktop visitor who went
    // nowhere. The genuine store click still gets counted, one beat later,
    // from the badges inside the modal.
    anchorProps: { href, onClick, "data-ga-store-intercepted": "true" },
    modal: (
      <AppHandoffModal
        marketId={marketId}
        open={open}
        placement={placement}
        onClose={() => setOpen(false)}
      />
    ),
  };
}
