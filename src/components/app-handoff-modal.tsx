import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CloseButton } from "@/components/close-button";
import { QrInstall } from "@/components/download/qr-install";
import { StoreBadges } from "@/components/app-store-badge";
import {
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const pricing =
    PRICING[marketId === "us" || marketId === "usg" ? "us" : "uk"];
  const qrUrl = appStoreUrlForMarketId(marketId === "usg" ? "us" : marketId);
  const icon =
    IOS_APP_LOGO_BY_MARKET[marketId === "usg" ? "us" : marketId] ??
    "/ios-app-logo.svg";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        className="absolute inset-0 z-0 cursor-default bg-black/50"
        tabIndex={-1}
        type="button"
        onClick={onClose}
      />
      <div
        aria-label="Get the ddbx app"
        aria-modal="true"
        className="animate-content-in relative z-10 w-full max-w-sm rounded-2xl border border-black/10 bg-background px-6 py-6 text-center shadow-2xl outline-none dark:border-white/10"
        role="dialog"
      >
        <CloseButton
          className="absolute right-4 top-4"
          data-ga-event="cta_app_handoff_close"
          data-ga-label={`App handoff close · ${placement}`}
          onClick={onClose}
        />

        <img
          alt=""
          className="mx-auto h-16 w-16 rounded-[1rem] border border-black/10 shadow-lg dark:border-white/10"
          src={icon}
        />
        <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em]">
          Get the ddbx app
        </h2>
        <ul className="mx-auto mt-3 max-w-[17rem] space-y-1.5 text-left text-sm">
          {BENEFITS.map((line) => (
            <li
              key={line}
              className="flex items-start gap-2 text-foreground/80"
            >
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
        <p className="mt-3 text-[11px] text-muted/70">
          Free for {pricing.trialDays} days, then{" "}
          {formatPrice(pricing, pricing.monthly)}/month. Cancel any time.
        </p>
      </div>
    </div>,
    document.body,
  );
}

/** Turns a direct store CTA into the handoff flow on desktop only.
 *
 *  Returns the props a store-bound anchor should spread: on iOS/Android the
 *  original href passes through untouched (the tap installs); on desktop the
 *  click is intercepted and the modal opens instead. Mount `modal` once,
 *  anywhere in the same tree.
 */
export function useAppHandoff(
  marketId: string,
  href: string,
  placement: string,
): {
  href: string;
  onClick?: (e: React.MouseEvent) => void;
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

  if (isMobile) {
    return { href, modal: null };
  }

  return {
    href,
    onClick,
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
