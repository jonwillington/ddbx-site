import type { ReactNode } from "react";
import type { NewsItem, NewsPayload } from "@/lib/markets/types";

import { useEffect, useRef, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  NewspaperIcon,
} from "@heroicons/react/24/outline";

import { Skeleton } from "@/components/skeleton";

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

interface MarketTodayDrawerProps {
  /** Optional news. null = loading skeleton; undefined = market has no news
   *  source yet (the whole drawer is hidden). */
  news?: NewsPayload | null;
  /** Heading rendered above the news strip. Defaults to "Market news". */
  newsHeading?: string;
  /** Caption rendered below the news strip. */
  newsFooterNote?: ReactNode;
}

/** Persistent right-hand drawer, lg+ only. Now news-only — today's filings
 *  graduated to the page hero. When a market has no news source we render
 *  nothing so the main content can use the full width. */
export function MarketTodayDrawer({
  news,
  newsHeading = "Market news",
  newsFooterNote,
}: MarketTodayDrawerProps) {
  const hasNewsSource = news !== undefined;
  const prevNewsUrlsRef = useRef<Set<string> | null>(null);
  const [newNewsUrls, setNewNewsUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!news || news.items.length === 0) return;
    const currentUrls = new Set(news.items.map((n) => n.url));

    if (prevNewsUrlsRef.current === null) {
      prevNewsUrlsRef.current = currentUrls;
    } else {
      const fresh = new Set<string>();

      for (const url of currentUrls) {
        if (!prevNewsUrlsRef.current.has(url)) fresh.add(url);
      }
      if (fresh.size > 0) setNewNewsUrls(fresh);
      prevNewsUrlsRef.current = currentUrls;
    }
  }, [news]);

  if (!hasNewsSource) return null;

  return (
    <aside className="hidden lg:flex fixed top-0 right-0 bottom-0 w-80 flex-col border-l border-[#e8e0d5] dark:border-separator bg-[#faf7f2] dark:bg-surface z-20">
      {/* Header — matches navbar h-16 */}
      <div className="h-16 px-5 flex items-center border-b border-[#e8e0d5] dark:border-separator shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <NewspaperIcon className="w-4 h-4 text-muted shrink-0" />
          <span className="text-sm font-semibold truncate">{newsHeading}</span>
        </div>
      </div>

      {/* News fills the whole drawer now. */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-x-0 top-0 h-4 pointer-events-none z-[1] bg-gradient-to-b from-[#faf7f2] dark:from-surface to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-4 pointer-events-none z-[1] bg-gradient-to-t from-[#faf7f2] dark:from-surface to-transparent" />
        <div className="h-full overflow-y-auto overscroll-contain">
          <NewsStrip
            footerNote={newsFooterNote}
            newNewsUrls={newNewsUrls}
            news={news}
          />
        </div>
      </div>
    </aside>
  );
}

function NewsStrip({
  news,
  footerNote,
  newNewsUrls,
}: {
  news: NewsPayload | null | undefined;
  footerNote?: ReactNode;
  newNewsUrls: Set<string>;
}) {
  return (
    <div className="px-5 lg:px-4 py-4">
      {news === null ? (
        <ul className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <li key={i} className="pb-0.5 flex items-start gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded-sm shrink-0 mt-0.5" />
              <span className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </span>
            </li>
          ))}
        </ul>
      ) : !news || news.items.length === 0 ? (
        <p className="text-xs text-muted">No headlines available right now.</p>
      ) : (
        <ul className="space-y-4">
          {news.items.slice(0, 20).map((n, i) => (
            <NewsRow
              key={`${n.url}-${i}`}
              fresh={newNewsUrls.has(n.url)}
              index={i}
              item={n}
            />
          ))}
        </ul>
      )}
      {news?.fetched_at && (
        <p className="text-[10px] text-muted/50 mt-3">
          Refreshed{" "}
          {new Date(news.fetched_at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}
      {footerNote && (
        <p className="text-[10px] text-muted/45 mt-2 leading-relaxed">
          {footerNote}
        </p>
      )}
    </div>
  );
}

function NewsRow({
  item,
  index,
  fresh,
}: {
  item: NewsItem;
  index: number;
  fresh: boolean;
}) {
  return (
    <li
      className="pb-0.5"
      style={{ animation: `fade-in-up 0.4s ease-out ${index * 0.04}s both` }}
    >
      <a
        className="flex items-start gap-2 group"
        href={item.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <img
          alt=""
          className="w-3.5 h-3.5 mt-0.5 rounded-sm shrink-0"
          loading="lazy"
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostnameFromUrl(item.url))}&sz=32`}
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-mono leading-none text-[#6b5038]/90 dark:text-[#c4a882] mb-1">
            {fresh && (
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#7c5cbf] animate-[fade-in-up_0.3s_ease-out]" />
            )}
            {item.source}
          </span>
          <span className="inline-flex items-start gap-1.5 text-xs text-foreground/90 leading-snug line-clamp-3 group-hover:text-[#6b5038] transition-colors">
            <span>{item.title}</span>
            <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5 shrink-0 mt-0.5 opacity-60 group-hover:opacity-100" />
          </span>
        </span>
      </a>
    </li>
  );
}
