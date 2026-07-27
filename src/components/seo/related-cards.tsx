/** Tile-card grid for onward links — the replacement for the family's bare
 *  underlined link lists ("Other sectors", "Related", "Head to head", the
 *  year archive), which read as sitemap dumps: no information to choose with
 *  and a ~20px tap target.
 *
 *  Each card is a labelled door: title, an optional clamped description, an
 *  optional media slot (logo stack, month figure). Internal links made more
 *  clickable is the SEO play these pages run on — the crawl graph gets denser
 *  without a single new URL.
 */
import type { ReactNode } from "react";

import { Link } from "react-router-dom";

export interface RelatedCard {
  to: string;
  title: ReactNode;
  description?: ReactNode;
  /** Left-of-title slot — overlapped broker logos, a company mark. */
  media?: ReactNode;
}

const COLS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

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
      {items.map((item) => (
        <li key={item.to} className="min-w-0">
          <Link
            className="flex h-full flex-col rounded-xl border border-hairline bg-sheet px-4 py-3.5 outline-none transition-colors hover:border-brand-brown/25 focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:border-white/[0.07] dark:bg-surface dark:hover:border-white/[0.16]"
            to={item.to}
          >
            <span className="flex items-center gap-2.5">
              {item.media ? (
                <span className="shrink-0">{item.media}</span>
              ) : null}
              <span className="min-w-0 truncate text-[13.5px] font-medium text-foreground">
                {item.title}
              </span>
            </span>
            {item.description ? (
              <span className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-foreground/45">
                {item.description}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
