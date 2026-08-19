/** The gate behind one line of the written case.
 *
 *  Every evidence headline on a filing page is a real finding stated in full
 *  — "Analyst consensus implies 33-37% upside from purchase price" — and the
 *  sentence explaining it is not. Clicking a headline is therefore the most
 *  qualified moment on the page: the reader has just chosen which part of the
 *  argument they want, which is a far better signal of intent than reaching
 *  the bottom of the document.
 *
 *  So the gate quotes the line they clicked back at them before it asks. A
 *  generic "get the app" modal fired from a specific click throws that context
 *  away and reads as an interstitial; naming the point makes the ask about the
 *  thing they wanted.
 *
 *  Chrome (sheet on mobile, modal on desktop) is `UnlockModal`.
 */
import { LockClosedIcon } from "@heroicons/react/20/solid";

import { StoreGlyph } from "@/components/store-glyph";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { UnlockModal } from "@/components/discretion/unlock-modal";
import { storeUrlForMarketId } from "@/lib/app-store";
import { downloadPagePathForMarketId } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";

export function AnalysisUnlockModal({
  open,
  onClose,
  headline,
  marketId = "uk",
  gaLabel,
}: {
  open: boolean;
  onClose: () => void;
  /** The evidence line the reader clicked. Null closes to a generic ask —
   *  used when the panel's own CTA opens the gate rather than a row. */
  headline: string | null;
  marketId?: string;
  gaLabel: string;
}) {
  const platform = useDevicePlatform();
  // Undefined means no truthful listing for this market on this device; the
  // market's /download page says so rather than installing the wrong product.
  const href =
    storeUrlForMarketId(marketId, platform) ??
    downloadPagePathForMarketId(marketId);

  const title = headline
    ? "The rest of this point is in the app"
    : "The written case is in the app";
  const message = headline
    ? `The evidence behind this finding, the thesis it supports and the risks weighed against it are in the app.`
    : `The thesis, the evidence behind every point and the key risks are in the app.`;

  return (
    <UnlockModal
      gaScope="analysis_unlock"
      message={message}
      open={open}
      title={title}
      onClose={onClose}
    >
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white dark:bg-white dark:text-ink">
        <LockClosedIcon className="h-5 w-5" />
      </span>
      <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em]">{title}</h2>

      {/* The clicked line, quoted. Left-set inside a centred dialog on
          purpose: it is the one piece of content here rather than chrome, and
          centring a two-line finding makes it read as a slogan. */}
      {headline ? (
        <blockquote className="mx-auto mt-3 max-w-xs border-l-2 border-brand-brown/30 pl-3 text-left text-[13.5px] leading-[1.5] text-foreground/80 dark:border-brand-tan/30">
          {headline}
        </blockquote>
      ) : null}

      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">
        {message}
      </p>

      <a
        className={`mt-5 flex w-full items-center justify-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-3.5 text-sm font-semibold transition-colors`}
        data-ga-event="cta_analysis_unlock_open_app"
        data-ga-label={gaLabel}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        <StoreGlyph className="h-4 w-4 shrink-0" />
        Start your free trial
      </a>
      <p className="mt-2.5 text-[11px] text-muted/70">
        Free for 7 days, cancel any time.
      </p>
    </UnlockModal>
  );
}
