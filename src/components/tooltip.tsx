import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Lightweight hover/focus tooltip. Renders the bubble in a portal on
 *  document.body with `position: fixed`, so it's never clipped by an ancestor's
 *  `overflow-hidden` (the feed rows scroll inside such a container) and never
 *  swallowed by the row-level <button>. Positioned above the trigger, centred.
 *  Pointer-events-none so it never steals the hover. */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function show() {
    const el = ref.current;

    if (!el) return;
    const r = el.getBoundingClientRect();

    setPos({ top: r.top, left: r.left + r.width / 2 });
  }

  return (
    <span
      ref={ref}
      className={className}
      onBlur={() => setPos(null)}
      onFocus={show}
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos &&
        createPortal(
          <span
            className="pointer-events-none fixed z-[100] max-w-[220px] -translate-x-1/2 -translate-y-full rounded-md bg-neutral-900 px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg dark:bg-neutral-800"
            role="tooltip"
            style={{ top: pos.top - 6, left: pos.left }}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
