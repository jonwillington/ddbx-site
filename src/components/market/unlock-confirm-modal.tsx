import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Drawer } from "vaul";

import { useMediaQuery } from "@/lib/use-media-query";

const CONFIRM_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5a4128] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#4a351f] dark:bg-white dark:text-[#1a140d] dark:hover:bg-white/90";
const CANCEL_CLASS =
  "flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium text-muted transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]";

/** Compact confirm dialog for spending the daily free analysis unlock. Replaces
 *  the native `window.confirm`, which renders as the browser's own chrome, with
 *  ours: a drag-to-dismiss bottom sheet on mobile (vaul) and a centered modal on
 *  desktop — same panel chrome as AppDrawer/AppModal so it reads as our content.
 *
 *  `handleOnly` confines the mobile drag to the grab handle so button taps never
 *  get swallowed by a drag gesture. */
export function UnlockConfirmModal({
  open,
  onConfirm,
  onCancel,
  title = "Use today's free analysis?",
  message,
  confirmLabel = "Open full analysis",
  cancelLabel = "Not now",
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const buttons = (
    <div className="mt-5 flex flex-col gap-2">
      <button className={CONFIRM_CLASS} type="button" onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button className={CANCEL_CLASS} type="button" onClick={onCancel}>
        {cancelLabel}
      </button>
    </div>
  );

  // Desktop is a hand-rolled centered modal (vaul only does edge-anchored
  // drawers). Lock body scroll + escape-to-cancel while open, mirroring AppModal.
  useEffect(() => {
    if (!isDesktop || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    const prevOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isDesktop, open, onCancel]);

  if (!isDesktop) {
    return (
      <Drawer.Root
        handleOnly
        direction="bottom"
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onCancel();
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <Drawer.Content className="fixed bottom-2 inset-x-2 z-50 rounded-2xl border border-black/10 bg-background shadow-2xl outline-none dark:border-white/10">
            <div className="flex shrink-0 justify-center pb-1 pt-3">
              <Drawer.Handle className="!w-10 !bg-black/15 dark:!bg-white/20" />
            </div>
            <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
              <Drawer.Title className="text-lg font-semibold tracking-[-0.02em]">
                {title}
              </Drawer.Title>
              <Drawer.Description className="mt-2 text-sm leading-relaxed text-muted">
                {message}
              </Drawer.Description>
              {buttons}
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
        aria-label="Cancel"
        className="absolute inset-0 z-0 cursor-default bg-black/50"
        tabIndex={-1}
        type="button"
        onClick={onCancel}
      />
      <div
        aria-label={title}
        aria-modal="true"
        className="animate-content-in relative z-10 w-full max-w-sm rounded-2xl border border-black/10 bg-background px-6 py-6 shadow-2xl outline-none dark:border-white/10"
        role="dialog"
      >
        <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        {buttons}
      </div>
    </div>,
    document.body,
  );
}
