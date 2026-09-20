import type { DailySummary, Dealing } from "@/types/ddbx";

import { useEffect, useState } from "react";

import { AppDrawer } from "@/components/app-drawer";
import { CompanyLogo } from "@/components/company-logo";
import { ShareRow } from "@/components/share-row";
import { Skeleton } from "@/components/skeleton";
import { api, type DailySummaryResponse } from "@/lib/api";
import { displayCompany, normalisedDisplayName } from "@/lib/display-name";

interface SheetProps {
  date: string | null;
  onClose: () => void;
  onSelectDeal?: (deal: Dealing) => void;
}

/** Modal port of the iOS DailySummaryView. Fetches the full
 *  {summary, cited} payload when opened — kept self-contained so the
 *  parent only has to know about the date being viewed. */
export function DailySummarySheet({ date, onClose, onSelectDeal }: SheetProps) {
  const open = date != null;
  const [phase, setPhase] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ready"; resp: DailySummaryResponse }
    | { kind: "unavailable" }
    | { kind: "error"; msg: string }
  >({ kind: "idle" });

  useEffect(() => {
    if (!open || !date) return;
    setPhase({ kind: "loading" });
    let cancelled = false;

    api
      .dailySummary(date)
      .then((resp) => {
        if (cancelled) return;
        setPhase(resp ? { kind: "ready", resp } : { kind: "unavailable" });
      })
      .catch((err) => {
        if (cancelled) return;
        setPhase({ kind: "error", msg: (err as Error).message });
      });

    return () => {
      cancelled = true;
    };
  }, [open, date]);

  return (
    <AppDrawer
      maxWidthClass="max-w-xl"
      open={open}
      title="Daily summary"
      onClose={onClose}
    >
      {phase.kind === "loading" && <SummarySkeleton />}
      {phase.kind === "unavailable" && <Unavailable />}
      {phase.kind === "error" && (
        <p className="text-sm text-negative">
          Couldn&apos;t load summary: {phase.msg}
        </p>
      )}
      {phase.kind === "ready" && date && (
        <SummaryBody
          cited={phase.resp.cited}
          shareDate={date}
          summary={phase.resp.summary}
          onSelectDeal={onSelectDeal}
        />
      )}
    </AppDrawer>
  );
}

/** Loading state in the arrived geometry — the date kicker, two headline
 *  lines, the two figure chips, the share row's discs, five paragraphs and
 *  the cited block, at the sizes and spacings they actually land at.
 *
 *  It replaces a single "Loading…" line, which was the worst kind of loading
 *  state: it occupied ~20px at the top of an empty sheet and then the real
 *  article redrew the panel from scratch. Static-page rule 6 asks a loading
 *  state to hold the shape that arrives, and this sheet's shape is knowable
 *  — every daily summary has a headline, two figures and a handful of
 *  paragraphs. The paragraph count (5) and the cited count (3) are the usual
 *  case rather than the true one, which is the most a skeleton can honestly
 *  claim before the fetch returns.
 *
 *  Last lines are short on purpose: a paragraph of full-width bars reads as a
 *  table, not prose. */
function SummarySkeleton() {
  const paragraphs = [4, 5, 4, 4, 3];

  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading the daily summary</span>

      <header className="space-y-2">
        <Skeleton className="h-[10px] w-40" />
        {/* 22px bar + 7px gap = the h2's own 29px line pitch (24px/tight). */}
        <div className="space-y-[7px] pt-0.5">
          <Skeleton className="h-[22px] w-full" />
          <Skeleton className="h-[22px] w-2/5" />
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          <Skeleton className="h-[26px] w-[86px] rounded-full" />
          <Skeleton className="h-[26px] w-[104px] rounded-full" />
        </div>
      </header>

      <div className="flex items-center gap-1.5">
        <Skeleton circle h={32} w={32} />
        <Skeleton circle h={32} w={32} />
        <Skeleton circle h={32} w={32} />
        <Skeleton circle h={32} w={32} />
      </div>

      <div className="space-y-3.5">
        {paragraphs.map((lines, i) => (
          /* 13px bar + 11px gap = the 24px line pitch of 15px/relaxed prose,
             so the block occupies the height the paragraph will. */
          <div key={i} className="space-y-[11px]">
            {Array.from({ length: lines }, (_, line) => (
              <Skeleton
                key={line}
                className={`h-[13px] ${line === lines - 1 ? "w-2/5" : "w-full"}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-rule pt-3">
        <Skeleton className="h-[11px] w-4/5 max-w-[320px]" />
      </div>

      <section className="space-y-2.5 pt-2">
        <Skeleton className="h-[10px] w-24" />
        <div className="divide-y divide-hairline dark:divide-separator overflow-hidden rounded-card border border-rule">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton circle h={28} w={28} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-[13px] w-1/2 max-w-[180px]" />
                <Skeleton className="h-[11px] w-2/3 max-w-[220px]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryBody({
  summary,
  cited,
  shareDate,
  onSelectDeal,
}: {
  summary: DailySummary;
  cited: Dealing[];
  /** The date the sheet was opened at — the same string the `day` URL param
   *  carries. Taken from the caller rather than `summary.date` so the shared
   *  link is guaranteed to reopen this sheet even if the payload ever spells
   *  its own date differently. */
  shareDate: string;
  onSelectDeal?: (deal: Dealing) => void;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="micro text-muted">{formatDate(summary.date)}</div>
        <h2 className="text-2xl font-bold leading-tight tracking-tight">
          {summary.headline}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <StatChip label="Deals" value={summary.total_count.toString()} />
          <StatChip label="Value" value={formatGbp(summary.total_value_gbp)} />
        </div>
      </header>
      {/* `?day=` is the sheet's own deep link — market-page.tsx holds the open
          date in that param, so the URL a reader shares reopens this exact
          summary rather than dropping them on today's home. UK-only, like the
          endpoint behind it. */}
      <ShareRow
        context="daily-summary"
        size="sm"
        title={summary.headline}
        url={`/?day=${shareDate}`}
      />
      <BodyProse markdown={summary.body} />
      <Attribution />
      {cited.length > 0 && (
        <CitedSection cited={cited} onSelectDeal={onSelectDeal} />
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-hairline dark:bg-surface-secondary px-2.5 py-1">
      <span className="text-xs font-semibold tabular-nums">{value}</span>
      <span className="text-caption text-muted">{label}</span>
    </span>
  );
}

function BodyProse({ markdown }: { markdown: string }) {
  const paragraphs = markdown
    .replace(/\r\n/g, "\n")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3.5 text-lede leading-relaxed text-foreground/90">
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInlineMarkdown(p)}</p>
      ))}
    </div>
  );
}

/** Tiny inline-markdown shim — only handles `**bold**`, which is the
 *  only formatting the server emits. Splitting on the bold delimiter
 *  avoids dragging a markdown library in for one feature. */
function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }

    return <span key={i}>{part}</span>;
  });
}

function Attribution() {
  return (
    <div className="text-xs text-muted border-t border-rule pt-3">
      Written by the ddbx.uk team, drafted with AI assistance after each market
      close.
    </div>
  );
}

function CitedSection({
  cited,
  onSelectDeal,
}: {
  cited: Dealing[];
  onSelectDeal?: (deal: Dealing) => void;
}) {
  return (
    <section className="space-y-2.5 pt-2">
      <h3 className="micro text-muted">Cited dealings</h3>
      <div className="rounded-card border border-rule divide-y divide-hairline dark:divide-separator overflow-hidden">
        {cited.map((deal) => (
          <button
            key={deal.id}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
            type="button"
            onClick={() => onSelectDeal?.(deal)}
          >
            <CompanyLogo size={28} ticker={deal.ticker} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">
                {displayCompany(deal.company, deal.ticker)}
              </div>
              <div className="text-xs text-muted truncate">
                {deal.ticker.replace(/\.L$/, "")} ·{" "}
                {normalisedDisplayName(deal.director.name)}
              </div>
            </div>
            <ChevronIcon />
          </button>
        ))}
      </div>
    </section>
  );
}

function Unavailable() {
  return (
    <div className="text-center py-10 text-sm text-muted">
      Summary not available yet. The team writes one after each market close.
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatGbp(gbp: number): string {
  if (gbp >= 1_000_000) return `£${(gbp / 1_000_000).toFixed(1)}M`;
  if (gbp >= 1_000) return `£${Math.round(gbp / 1_000)}k`;

  return `£${gbp}`;
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="w-3 h-3 text-muted/70 shrink-0"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M6 3l5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
