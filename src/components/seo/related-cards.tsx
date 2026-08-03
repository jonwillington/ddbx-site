/** Tile-card grid for onward links — the replacement for the family's bare
 *  underlined link lists ("Other sectors", "Related", "Head to head", the
 *  year archive), which read as sitemap dumps: no information to choose with
 *  and a ~20px tap target.
 *
 *  Each card is a labelled door: a mark, a title, an optional clamped
 *  description, and a trailing arrow. Internal links made more clickable is the
 *  SEO play these pages run on — the crawl graph gets denser without a single
 *  new URL.
 *
 *  THE MARK AND THE ARROW ARE THE POINT. The first version was a title over
 *  two lines of grey with a hairline round it, which is the same object a
 *  paragraph is: nothing about it said "this goes somewhere", so a "Read next"
 *  block at the foot of a filing page read as a summary of things that exist
 *  rather than four places to go. Both additions are automatic — the icon is
 *  derived from the destination path, so all fifteen callers gained it without
 *  touching one of them, and a caller with something better to show (a company
 *  logo, a pair of broker marks) still passes `media` and wins.
 */
import type { ReactNode } from "react";

import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import {
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ScaleIcon,
  Squares2X2Icon,
  TrophyIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

export interface RelatedCard {
  to: string;
  title: ReactNode;
  description?: ReactNode;
  /** Left-of-title slot — overlapped broker logos, a company mark. Overrides
   *  the icon derived from `to`. */
  media?: ReactNode;
}

const COLS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

/** Destination path -> the mark that stands for that kind of page.
 *
 *  Ordered, first match wins, so `/company/BP.L` is matched before the bare
 *  `/companies` prefix would catch it. Deliberately coarse: the job is to make
 *  a row scannable ("that one's a company, that one's a guide"), not to give
 *  every route its own glyph. Anything unmatched falls back to the document
 *  mark rather than rendering an empty slot, because a grid where some cards
 *  have a mark and others have a gap is worse than one with no marks at all. */
const ICON_FOR: [RegExp, typeof DocumentTextIcon][] = [
  [/^\/company\//, BuildingOffice2Icon],
  [/^\/companies/, BuildingOffice2Icon],
  [/^\/sectors?\b/, Squares2X2Icon],
  [/^\/biggest-buys/, TrophyIcon],
  [/^\/directors?\//, UserIcon],
  [/^\/dealings\//, BanknotesIcon],
  [/^\/(us\/)?congress/, BuildingLibraryIcon],
  [/^\/how-it-works/, AcademicCapIcon],
  [/^\/learn/, BookOpenIcon],
  [/^\/(compare|brokers)/, ScaleIcon],
  [/^\/weekly/, CalendarDaysIcon],
  [/^\/reports?\b/, DocumentTextIcon],
  [/^\/performance/, ArrowTrendingUpIcon],
];

function iconFor(to: string) {
  const path = to.split(/[?#]/)[0];

  return ICON_FOR.find(([re]) => re.test(path))?.[1] ?? DocumentTextIcon;
}

export function RelatedCards({
  items,
  cols = 3,
  className = "",
}: {
  items: RelatedCard[];
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <ul className={`grid gap-2 ${COLS[cols]} ${className}`}>
      {items.map((item) => {
        const Icon = iconFor(item.to);

        return (
          <li key={item.to} className="min-w-0">
            <Link
              className="group flex h-full items-start gap-3 rounded-xl border border-hairline bg-sheet px-4 py-3.5 outline-none transition-colors hover:border-brand-brown/25 hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:border-white/[0.07] dark:bg-surface dark:hover:border-white/[0.16] dark:hover:bg-surface-secondary"
              to={item.to}
            >
              {/* The mark, in a tinted well so it reads as a fixture of the
                  card rather than an icon someone dropped in front of the
                  text. A caller's own media keeps its natural shape — a
                  company logo is already a disc and boxing it would double the
                  frame. */}
              {item.media ? (
                <span className="mt-px shrink-0">{item.media}</span>
              ) : (
                <span
                  aria-hidden
                  className="mt-px inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-brown/[0.07] text-brand-brown dark:bg-brand-tan/[0.1] dark:text-brand-tan"
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium leading-[1.35] text-foreground">
                  {item.title}
                </span>
                {item.description ? (
                  <span className="mt-1 line-clamp-2 block text-[12px] leading-[1.5] text-foreground/45">
                    {item.description}
                  </span>
                ) : null}
              </span>

              {/* Nudged on hover rather than appearing on it: an arrow that
                  only exists once you are already pointing at the card cannot
                  have told you the card was a link. */}
              <ArrowRightIcon
                aria-hidden
                className="mt-1.5 h-4 w-4 shrink-0 text-foreground/25 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground/60"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
