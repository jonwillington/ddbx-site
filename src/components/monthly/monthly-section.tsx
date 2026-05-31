import type { ReactNode } from "react";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

/** A titled block in the recap's overview column. On mobile it's a collapsible
 *  recessed card (tap the title to reveal) — this takes the weight off the long
 *  single-column page, mirroring the iOS MonthlyRetroView's concealed sections.
 *  On lg+ the two-column layout has room, so it renders the children plainly
 *  (no card, no title, always open) — the desktop layout is unchanged and the
 *  child keeps whatever heading it already had. Collapsed by default, like iOS. */
export function MonthlySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl bg-surface/40 p-3 dark:bg-white/[0.03] lg:rounded-none lg:bg-transparent lg:p-0 lg:dark:bg-transparent">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 lg:hidden"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>
      <div className={`${open ? "mt-3 block" : "hidden"} lg:mt-0 lg:block`}>
        {children}
      </div>
    </section>
  );
}
