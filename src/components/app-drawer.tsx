import type { ReactNode } from "react";

import { Drawer } from "vaul";

import { useMediaQuery } from "@/lib/use-media-query";
import { CloseButton } from "@/components/close-button";

/** Shared drawer shell used by every non-dealing panel (legal pages, daily
 *  summary, performance metric/criteria/sector sheets). Same chrome as the
 *  dealing detail drawer: vaul slides it in from the right as a detached,
 *  rounded, floating panel on md+ and rises as a drag-to-dismiss bottom sheet
 *  on mobile. vaul owns the backdrop, slide/transform, escape-to-close,
 *  body-scroll lock and focus trap; callers supply the title and body.
 *
 *  `handleOnly` keeps drag-to-dismiss confined to the mobile grab handle so a
 *  scrollable body never hijacks a drag. */
export function AppDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = "max-w-2xl",
  bodyClassName = "px-5 md:px-6 py-5",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Desktop panel width cap. Narrower sheets (pickers) can pass max-w-md. */
  maxWidthClass?: string;
  /** Padding/layout for the scroll body. Pass "" for full-bleed lists that
   *  carry their own row padding. */
  bodyClassName?: string;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const direction = isDesktop ? "right" : "bottom";

  // Detached, floating panel: a gap on every free edge + rounded corners so it
  // reads as a card lifted off the page. Desktop floats off the right; mobile
  // floats up from the bottom.
  const contentClass = isDesktop
    ? `fixed top-3 bottom-3 right-3 z-50 w-[calc(100vw-1.5rem)] ${maxWidthClass} rounded-2xl bg-background border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden outline-none`
    : "fixed bottom-2 inset-x-2 z-50 h-[88vh] max-h-[88vh] rounded-2xl bg-background border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden outline-none";

  return (
    <Drawer.Root
      handleOnly
      direction={direction}
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className={contentClass}>
          {!isDesktop && (
            <div className="shrink-0 pt-3 pb-1 flex justify-center">
              <Drawer.Handle className="!w-10 !bg-black/15 dark:!bg-white/20" />
            </div>
          )}

          <div className="shrink-0 flex items-start justify-between gap-3 px-5 md:px-6 py-4 border-b border-black/10 dark:border-white/10">
            <div className="min-w-0">
              <Drawer.Title className="text-base font-semibold truncate">
                {title}
              </Drawer.Title>
              {subtitle && (
                <Drawer.Description className="mt-0.5 text-xs text-muted">
                  {subtitle}
                </Drawer.Description>
              )}
            </div>
            <CloseButton onClick={onClose} />
          </div>

          {/* sr-only description keeps the dialog labelled when no visible
              subtitle is supplied. */}
          {!subtitle && (
            <Drawer.Description className="sr-only">{title}</Drawer.Description>
          )}

          <div
            className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain ${bodyClassName}`}
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
