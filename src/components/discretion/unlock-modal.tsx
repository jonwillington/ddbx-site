/** The chrome every "this is in the app" gate shares.
 *
 *  Bottom sheet on mobile, centred modal on desktop — vaul only does
 *  edge-anchored drawers, so the desktop half is hand-rolled, with body-scroll
 *  lock and escape-to-close while open.
 *
 *  It exists because that split was about to be written a third time. The
 *  month gate and the day gate each carried their own copy of the same ninety
 *  lines, differing only in their GA labels, and every fix to one (the escape
 *  handler, the safe-area padding on the sheet, the overlay being a real
 *  button so a click outside closes it) had to be remembered for the other.
 *
 *  Callers supply the CONTENT — icon, heading, message, call to action — and
 *  nothing else. `gaScope` names the gate in the analytics events the chrome
 *  fires on its own controls, so close and overlay-dismiss stay attributable
 *  per gate without each caller wiring them up.
 */
import type { ReactNode } from "react";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Drawer } from "vaul";

import { CloseButton } from "@/components/close-button";
import { useMediaQuery } from "@/lib/use-media-query";

export function UnlockModal({
  open,
  onClose,
  title,
  message,
  gaScope,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog, and the sheet's screen-reader title. */
  title: string;
  /** Screen-reader description. The visible copy lives in `children`, which
   *  is free to set it differently; this is what a non-visual reader is told
   *  the dialog is for. */
  message: string;
  /** Short kebab/underscore id for GA events, e.g. "month_unlock". */
  gaScope: string;
  children: ReactNode;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (!isDesktop || !open) return;
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
  }, [isDesktop, open, onClose]);

  if (!isDesktop) {
    return (
      <Drawer.Root
        handleOnly
        direction="bottom"
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <Drawer.Content className="unlock-confirm-sheet fixed bottom-2 inset-x-2 z-50 rounded-2xl border border-black/10 bg-background shadow-2xl outline-none dark:border-white/10">
            <div className="flex shrink-0 justify-center pb-1 pt-3">
              <Drawer.Handle className="!w-10 !bg-black/15 dark:!bg-white/20" />
            </div>
            <div className="relative px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-center">
              <CloseButton
                className="absolute right-3 top-2"
                data-ga-event={`cta_${gaScope}_close`}
                data-ga-label={`${gaScope} close`}
                onClick={onClose}
              />
              <Drawer.Title className="sr-only">{title}</Drawer.Title>
              <Drawer.Description className="sr-only">
                {message}
              </Drawer.Description>
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        className="absolute inset-0 z-0 cursor-default bg-black/50"
        data-ga-event={`cta_${gaScope}_overlay_close`}
        data-ga-label={`${gaScope} overlay close`}
        tabIndex={-1}
        type="button"
        onClick={onClose}
      />
      <div
        aria-label={title}
        aria-modal="true"
        className="animate-content-in relative z-10 w-full max-w-sm rounded-2xl border border-black/10 bg-background px-6 py-6 text-center shadow-2xl outline-none dark:border-white/10"
        role="dialog"
      >
        <CloseButton
          className="absolute right-4 top-4"
          data-ga-event={`cta_${gaScope}_close`}
          data-ga-label={`${gaScope} close`}
          onClick={onClose}
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}
