import type { DailySummary, Dealing } from "@/types/ddbx";

import { useEffect, useState } from "react";

import { AppDrawer } from "@/components/app-drawer";
import { CompanyLogo } from "@/components/company-logo";
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
      {phase.kind === "loading" && (
        <p className="text-sm text-muted">Loading…</p>
      )}
      {phase.kind === "unavailable" && <Unavailable />}
      {phase.kind === "error" && (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Couldn&apos;t load summary: {phase.msg}
        </p>
      )}
      {phase.kind === "ready" && (
        <SummaryBody
          cited={phase.resp.cited}
          summary={phase.resp.summary}
          onSelectDeal={onSelectDeal}
        />
      )}
    </AppDrawer>
  );
}

function SummaryBody({
  summary,
  cited,
  onSelectDeal,
}: {
  summary: DailySummary;
  cited: Dealing[];
  onSelectDeal?: (deal: Dealing) => void;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted">
          {formatDate(summary.date)}
        </div>
        <h2 className="text-2xl font-bold leading-tight tracking-tight">
          {summary.headline}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <StatChip label="Deals" value={summary.total_count.toString()} />
          <StatChip label="Value" value={formatGbp(summary.total_value_gbp)} />
        </div>
      </header>
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
      <span className="text-[11px] text-muted">{label}</span>
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
    <div className="space-y-3.5 text-[15px] leading-relaxed text-foreground/90">
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
    <div className="text-xs text-muted border-t border-black/[0.06] dark:border-white/[0.06] pt-3">
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
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        Cited dealings
      </h3>
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] divide-y divide-black/[0.06] dark:divide-separator overflow-hidden">
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
