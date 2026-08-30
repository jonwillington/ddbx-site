/** The filing page's numbered run, compressed for the phone.
 *
 *  On desktop the argument renders as the full stacked `SeoSection` run. On a
 *  phone that run was the page's whole problem: a full-height price chart and
 *  a cluster calendar stood between the header and the written analysis, and
 *  each numbered section ate a screen or more before the reader learned
 *  whether it held anything they wanted.
 *
 *  So on mobile the run becomes this: one full-width hairline row per section
 *  (the design language's tenet 3 — counter + heading left, quiet one-line
 *  hint under it, generous vertical padding, rules between rows), directly
 *  after the verdict band. Tapping a row opens that section's content in the
 *  house bottom sheet (`AppDrawer`), so the page stays one screen of headings
 *  and the reader chooses their own way in.
 *
 *  The bodies are authored ONCE, by the page, in the same
 *  `FilingSectionEntry[]` both layouts render from — this component never
 *  duplicates them, it just mounts the active one inside the drawer. Only the
 *  open section's body is mounted at all, so the chart is fetched when the
 *  reader asks for it and not before.
 *
 *  Nothing here animates beyond what `AppDrawer` (vaul) already does, so
 *  there is no reduced-motion work to do in this file.
 */
import type { ReactNode } from "react";

import { useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";

import { AppDrawer } from "@/components/app-drawer";

const RULE = "border-hairline dark:border-separator";

export interface FilingSectionEntry {
  key: string;
  title: string;
  /** One line for the row and the drawer subtitle. Deliberately tighter than
   *  the desktop `aside` — a row carries a lead, not a paragraph. */
  hint: string;
  /** The section body, authored once by the page: rendered inline inside a
   *  `SeoSection` on desktop, and inside the drawer here. */
  body: ReactNode;
  /** Drawer-only footer — the section's trial nudge, so the ask still meets
   *  the reader at the natural pause after the content, as it does between
   *  the stacked sections on desktop. */
  drawerFoot?: ReactNode;
}

export function FilingSectionRows({
  sections,
}: {
  sections: FilingSectionEntry[];
}) {
  // Two states rather than one nullable key: `active` must survive the close
  // so the body doesn't vanish mid-slide while vaul animates the sheet away.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const active = sections.find((s) => s.key === activeKey) ?? null;

  return (
    <>
      <div className={`mt-8 border-t ${RULE}`}>
        {sections.map((s, i) => (
          <button
            key={s.key}
            className={`flex w-full items-center gap-4 border-b ${RULE} py-5 text-left`}
            type="button"
            onClick={() => {
              setActiveKey(s.key);
              setOpen(true);
            }}
          >
            {/* The house counter spec, numbering the rows in THIS list's
                order — the mobile read is its own run, not a citation of the
                desktop one. */}
            <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums tracking-[0.16em] text-foreground/35">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16.5px] font-semibold leading-[1.25] tracking-[-0.015em] text-foreground">
                {s.title}
              </span>
              {/* Truncated, never wrapped: the row's job is to stay a row. */}
              <span className="mt-1 block truncate text-[12.5px] leading-[1.5] text-foreground/55">
                {s.hint}
              </span>
            </span>
            <ChevronRightIcon
              aria-hidden
              className="h-4 w-4 shrink-0 text-foreground/35"
            />
          </button>
        ))}
      </div>

      <AppDrawer
        open={open && active != null}
        subtitle={active?.hint}
        title={active?.title ?? ""}
        onClose={() => setOpen(false)}
      >
        {active ? (
          <>
            {active.body}
            {active.drawerFoot ? (
              <div className="mt-8">{active.drawerFoot}</div>
            ) : null}
          </>
        ) : null}
      </AppDrawer>
    </>
  );
}
