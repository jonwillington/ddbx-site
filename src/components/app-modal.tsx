import type { ReactNode } from "react";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Drawer } from "vaul";

import { useMediaQuery } from "@/lib/use-media-query";

/** Centered-modal sibling of {@link AppDrawer}. Content-heavy panels (the
 *  monthly recap) need more horizontal room than the right-edge side panel
 *  AppDrawer gives on desktop, so this renders a *centered* dialog on md+ and
 *  falls back to the exact same drag-to-dismiss vaul bottom sheet on mobile.
 *
 *  Same prop surface as AppDrawer so callers can swap between the two. The
 *  desktop branch is hand-rolled (portal + backdrop + CSS fade) rather than
 *  vaul, which only does edge-anchored drawers. */
export function AppModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  headerRight,
  maxWidthClass = "max-w-3xl",
  bodyClassName = "px-5 md:px-7 py-6",
  titleClassName = "text-base font-semibold truncate",
  fill = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Optional controls pinned to the right of the header (e.g. month chooser). */
  headerRight?: ReactNode;
  /** Desktop panel width cap. */
  maxWidthClass?: string;
  /** Styling for the header title. Override to make the title more dominant. */
  titleClassName?: string;
  /** Padding/layout for the scroll body. Pass "" for full-bleed content. */
  bodyClassName?: string;
  /** When true, the desktop (lg+) body stops being the scroll container and
   *  instead fills the panel height so children can own their own scrolling
   *  (e.g. the recap modal's two independently-scrolling columns). Below lg
   *  and on the mobile sheet the body scrolls as one, as usual. */
  fill?: boolean;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // Independent-scroll layouts only kick in at lg+; between md and lg the
  // panel is still a single column, so the body must keep scrolling normally.
  const isLgUp = useMediaQuery("(min-width: 1024px)");
  const fillMode = fill && isLgUp;

  // Desktop: lock body scroll + escape-to-close while open. vaul owns both on
  // mobile, so only wire them up for the hand-rolled desktop branch.
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

  const header = (
    <div className="shrink-0 flex items-start justify-between gap-3 px-5 md:px-6 py-4 border-b border-black/10 dark:border-white/10">
      <div className="min-w-0">
        <h2 className={titleClassName}>{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {headerRight}
        <button
          aria-label="Close"
          className="shrink-0 text-muted hover:text-foreground text-2xl leading-none px-1"
          type="button"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>
  );

  const body = (
    <div
      className={`flex-1 min-h-0 overflow-x-hidden overscroll-contain ${
        fillMode ? "flex flex-col overflow-hidden" : "overflow-y-auto"
      } ${bodyClassName}`}
    >
      {children}
    </div>
  );

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
          <Drawer.Content className="fixed bottom-2 inset-x-2 z-50 h-[92vh] max-h-[92vh] rounded-2xl bg-background border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden outline-none">
            <div className="shrink-0 pt-3 pb-1 flex justify-center">
              <Drawer.Handle className="!w-10 !bg-black/15 dark:!bg-white/20" />
            </div>
            <Drawer.Title className="sr-only">
              {typeof title === "string" ? title : "Report"}
            </Drawer.Title>
            {header}
            {body}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <button
        aria-label="Close"
        className="absolute inset-0 z-0 cursor-default bg-black/50"
        tabIndex={-1}
        type="button"
        onClick={onClose}
      />
      <div
        aria-modal="true"
        className={`relative z-10 w-full ${maxWidthClass} max-h-[90vh] rounded-2xl bg-background border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden outline-none animate-content-in`}
        role="dialog"
      >
        {header}
        {body}
      </div>
    </div>,
    document.body,
  );
}
