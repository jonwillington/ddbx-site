import type { ReactNode } from "react";
import type { NewsItem, NewsPayload } from "@/lib/markets/types";
import type { ChannelPerformanceSummary } from "@/lib/performance/channel-summary";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  NewspaperIcon,
} from "@heroicons/react/24/outline";

import { ChannelPerformance } from "./channel-performance";

import { Skeleton } from "@/components/skeleton";

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

type TabId = "performance" | "news";

interface MarketChannelProps {
  /** "aside" = fixed lg+ right rail. "inline" = full-width card in the mobile
   *  page flow (the rail is hidden on small screens). */
  variant: "aside" | "inline";
  /** Optional news. null = loading skeleton; undefined = market has no news
   *  source. */
  news?: NewsPayload | null;
  newsHeading?: string;
  newsFooterNote?: ReactNode;
  /** Whether this market has a Performance tab at all. Capability, not data —
   *  drives the tab from first paint so it doesn't pop in once dealings load. */
  supportsPerformance: boolean;
  /** Performance summary. May be empty (sampleSize 0) while dealings load. */
  performance?: ChannelPerformanceSummary;
  discretionEnabled: boolean;
  performanceHref: string;
  appHref: string;
}

/** The right-hand channel. Two tabs — Performance (the just-shipped backtest
 *  stats, condensed) and News. Performance is the default when the market
 *  supports it; markets without it fall back to News-only. Rendered twice by
 *  the page: as a fixed rail on lg+ and inline on mobile (where the rail is
 *  hidden), so the channel is finally visible on phones. */
export function MarketChannel({
  variant,
  news,
  newsHeading = "Market news",
  newsFooterNote,
  supportsPerformance,
  performance,
  discretionEnabled,
  performanceHref,
  appHref,
}: MarketChannelProps) {
  const hasNews = news !== undefined;
  // Capability, not data: the Performance tab exists (and defaults) from the
  // first paint so it never pops in or steals focus once dealings load.
  const hasPerf = supportsPerformance;
  const perfReady = !!performance && performance.sampleSize > 0;

  const prevNewsUrlsRef = useRef<Set<string> | null>(null);
  const [newNewsUrls, setNewNewsUrls] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<TabId>(hasPerf ? "performance" : "news");
  const touchedRef = useRef(false);

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

  // Keep the active tab valid if a capability disappears.
  const activeTab: TabId = useMemo(() => {
    if (tab === "performance" && !hasPerf) return "news";
    if (tab === "news" && !hasNews) return "performance";

    return tab;
  }, [tab, hasPerf, hasNews]);

  if (!hasNews && !hasPerf) return null;

  const selectTab = (next: TabId) => {
    touchedRef.current = true;
    setTab(next);
  };

  const tabs = (
    <div className="flex items-center gap-1">
      {hasPerf && (
        <TabButton
          active={activeTab === "performance"}
          icon={<ChartBarIcon className="w-4 h-4" />}
          label="Performance"
          onClick={() => selectTab("performance")}
        />
      )}
      {hasNews && (
        <TabButton
          active={activeTab === "news"}
          icon={<NewspaperIcon className="w-4 h-4" />}
          label="News"
          onClick={() => selectTab("news")}
        />
      )}
    </div>
  );

  const body =
    activeTab === "performance" && hasPerf ? (
      perfReady ? (
        <ChannelPerformance
          appHref={appHref}
          discretionEnabled={discretionEnabled}
          performanceHref={performanceHref}
          summary={performance!}
        />
      ) : (
        <PerfSkeleton />
      )
    ) : (
      <NewsStrip
        footerNote={newsFooterNote}
        heading={newsHeading}
        newNewsUrls={newNewsUrls}
        news={news ?? null}
      />
    );

  if (variant === "inline") {
    return (
      <aside className="lg:hidden rounded-xl border border-[#e8e0d5] dark:border-separator bg-[#faf7f2] dark:bg-surface overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e8e0d5] dark:border-separator">
          {tabs}
        </div>
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
          {body}
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex fixed top-0 right-0 bottom-0 w-80 flex-col border-l border-[#e8e0d5] dark:border-separator bg-[#faf7f2] dark:bg-surface z-20">
      {/* Header — matches navbar h-16 */}
      <div className="h-16 px-4 flex items-center border-b border-[#e8e0d5] dark:border-separator shrink-0">
        {tabs}
      </div>

      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-x-0 top-0 h-4 pointer-events-none z-[1] bg-gradient-to-b from-[#faf7f2] dark:from-surface to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-4 pointer-events-none z-[1] bg-gradient-to-t from-[#faf7f2] dark:from-surface to-transparent" />
        <div className="h-full overflow-y-auto overscroll-contain">{body}</div>
      </div>
    </aside>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-[#5a4128]/15 text-[#3d2b1a] dark:text-[#ad9479]"
          : "text-muted hover:text-foreground"
      }`}
      role="tab"
      type="button"
      onClick={onClick}
    >
      <span className={active ? "" : "text-muted"}>{icon}</span>
      {label}
    </button>
  );
}

function PerfSkeleton() {
  return (
    <div className="px-5 lg:px-4 py-4 space-y-5">
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-7 w-20" />
        </div>
        <div className="flex-1 flex flex-col items-end space-y-1.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-28" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

function NewsStrip({
  news,
  heading,
  footerNote,
  newNewsUrls,
}: {
  news: NewsPayload | null | undefined;
  heading: string;
  footerNote?: ReactNode;
  newNewsUrls: Set<string>;
}) {
  return (
    <div className="px-5 lg:px-4 py-4">
      <p className="sr-only">{heading}</p>
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
          <span className="flex items-center gap-1.5 text-[10px] font-mono leading-none text-[#5a4128]/90 dark:text-[#ad9479] mb-1">
            {fresh && (
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#7c5cbf] animate-[fade-in-up_0.3s_ease-out]" />
            )}
            {item.source}
          </span>
          <span className="inline-flex items-start gap-1.5 text-xs text-foreground/90 leading-snug line-clamp-3 group-hover:text-[#5a4128] transition-colors">
            <span>{item.title}</span>
            <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5 shrink-0 mt-0.5 opacity-60 group-hover:opacity-100" />
          </span>
        </span>
      </a>
    </li>
  );
}
