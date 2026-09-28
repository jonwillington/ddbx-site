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
import { ArrowRightIcon, ChevronRightIcon } from "@heroicons/react/20/solid";

import { AppDrawer } from "@/components/app-drawer";
import { panel } from "@/components/ui/panel";
import {
  BUTTON_FILLED_GROUP,
  BUTTON_GHOST,
  BUTTON_RADIUS,
} from "@/components/button";

export interface FilingSectionEntry {
  key: string;
  title: string;
  /** One line for the row and the drawer subtitle. Deliberately tighter than
   *  the desktop `aside` — a row carries a lead, not a paragraph. */
  hint: string;
  /** The section body, authored once by the page: rendered inline inside a
   *  `SeoSection` on desktop, and inside the drawer here. */
  body: ReactNode;
  /** A sample of the body, shown on the row in place of `hint` (which stays
   *  the drawer subtitle). A row that describes its content is a table of
   *  contents; a row that shows some of it is a reason to tap. */
  preview?: ReactNode;
  /** Set the row as a contained card rather than a hairline row. One per
   *  list at most: the section that carries the page's value (the analysis). */
  feature?: boolean;
  /** The label on the row's open button, in the section's own words ("See
   *  each check"). A bare chevron was too quiet to read as "tap to open". */
  cta?: string;
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

  const featured = sections.find((s) => s.feature) ?? null;
  const rows = sections.filter((s) => s !== featured);
  const openSection = (key: string) => {
    setActiveKey(key);
    setOpen(true);
  };

  return (
    <>
      {featured ? (
        // The featured section, contained (design language tenet 1): a card
        // carrying a sample of the analysis, so the page's value is visible
        // before the tap rather than described by a heading among three.
        <button
          className={`${panel({ size: "roomy", lift: true })} group mt-8 block w-full text-left`}
          type="button"
          onClick={() => openSection(featured.key)}
        >
          <span className="eyebrow block text-foreground/45">
            {featured.title}
          </span>
          {featured.preview ?? (
            <span className="mt-2 block text-small text-foreground/55">
              {featured.hint}
            </span>
          )}
          {/* A real button, not a text link: the card's one job is to be
              opened, so the way in reads as a thing to press. */}
          <span
            className={`${BUTTON_FILLED_GROUP} ${BUTTON_RADIUS} mt-6 flex w-full items-center justify-center gap-2 py-3.5 text-label font-semibold`}
          >
            {featured.cta ?? "Read the full analysis"}
            <ArrowRightIcon aria-hidden className="h-4 w-4 shrink-0" />
          </span>
        </button>
      ) : null}

      {rows.length > 0 ? (
        <div className={`${featured ? "mt-6" : "mt-8"} border-t border-rule`}>
          {rows.map((s, i) => (
            <button
              key={s.key}
              className="flex w-full items-center gap-4 border-b border-rule py-5 text-left"
              type="button"
              onClick={() => openSection(s.key)}
            >
              {/* The house counter spec, numbering the rows in THIS list's
                  order — the mobile read is its own run, not a citation of
                  the desktop one. */}
              <span className="shrink-0 self-start pt-1.5 font-mono text-caption font-semibold tabular-nums tracking-widest text-foreground/35">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-subheading font-semibold text-foreground">
                  {s.title}
                </span>
                {s.preview ?? (
                  // Truncated, never wrapped: the row's job is to stay a row.
                  <span className="mt-1 block text-body text-foreground/65">
                    {s.hint}
                  </span>
                )}
                {/* The way in, labelled: a quiet chevron at the row's edge
                    was not reading as something to tap. */}
                <span
                  className={`${BUTTON_GHOST} ${BUTTON_RADIUS} mt-4 inline-flex items-center gap-1 py-2 pl-3.5 pr-2.5 text-label font-semibold`}
                >
                  {s.cta ?? "Open"}
                  <ChevronRightIcon aria-hidden className="h-4 w-4 shrink-0" />
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

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
