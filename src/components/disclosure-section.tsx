import type { ReactNode } from "react";

import { ChevronRightIcon } from "@heroicons/react/20/solid";

/** Collapsible bordered section for secondary detail in market drawers.
 *  Wraps native &lt;details&gt; so it stays keyboard / screen-reader friendly
 *  without bringing in a third-party disclosure primitive. */
export function DisclosureSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-surface"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none select-none items-center gap-2 px-4 py-3">
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90" />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
          {count !== undefined && (
            <span className="ml-1.5 font-mono normal-case tracking-normal text-foreground/50">
              ({count})
            </span>
          )}
        </span>
      </summary>
      <div className="border-t border-black/[0.04] px-4 pb-4 pt-3 dark:border-white/[0.06]">
        {children}
      </div>
    </details>
  );
}
