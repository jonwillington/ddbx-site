import type { FlagComponent } from "country-flag-icons/react/3x2";

import { useEffect, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { GB, NL, SE, US } from "country-flag-icons/react/3x2";

import { Terminal } from "@/components/api/terminal";
import { CompanyLogo } from "@/components/company-logo";
import { RatingBadge } from "@/components/rating-badge";
import { Skeleton } from "@/components/skeleton";
import {
  type McpDealing,
  type McpMarket,
  searchDealings,
  shortDate,
  valueText,
} from "@/lib/mcp";

/** The hero's proof object: a REAL `search_dealings` call, made from the
 *  reader's own browser as the page loads, rendered the way an assistant
 *  would relay it.
 *
 *  The API page's equivalent panel shows pasted JSON. This one calls the
 *  connector live for two reasons. First, the claim being sold is "your
 *  assistant can see this right now", and a sample dated last July says the
 *  opposite. Second, the connector is open to browsers (no key, open CORS), so
 *  a live call costs nothing and a pasted payload would be a fiction where a
 *  fact was available.
 *
 *  Three states, kept distinct as the static-page rules require: loading (a
 *  skeleton of the same three-row geometry), failed (the connector could not
 *  be reached, with a retry), and empty (the call worked and the market has
 *  nothing rated on its first page). Empty is a fact about the market and
 *  failed is a fact about the network; showing one for the other is a lie.
 *
 *  Rows are rendered as facts, not JSON, because a layman reads "Alison
 *  Brittain, Chair, bought £73k" in two seconds and `"value": 73229` in ten.
 *  The fields are exactly the thin tier the server sends: nothing here is
 *  derived from anything the connector does not return. Every row links to
 *  its ddbx page, which is also what the assistant is instructed to do. */

const ROWS = 3;

interface MarketTab {
  id: McpMarket;
  code: string;
  label: string;
  Flag: FlagComponent;
}

const MARKETS: MarketTab[] = [
  { id: "UK", code: "UK", label: "United Kingdom", Flag: GB },
  { id: "US", code: "US", label: "United States", Flag: US },
  { id: "SE", code: "SE", label: "Sweden", Flag: SE },
  { id: "NL", code: "NL", label: "Netherlands", Flag: NL },
  { id: "USG", code: "Congress", label: "US Congress", Flag: US },
];

type State =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "ready"; rows: McpDealing[]; ms: number };

function verb(d: McpDealing): string {
  return d.side === "buy" ? "bought" : d.side === "sell" ? "sold" : "traded";
}

function RowSkeleton() {
  return (
    <li className="flex items-center gap-3 border-t border-white/[0.06] px-4 py-3 first:border-t-0">
      <Skeleton circle className="shrink-0" h={36} w={36} />
      <div className="min-w-0 flex-1">
        <Skeleton h={14} w="58%" />
        <Skeleton className="mt-2" h={11} w="78%" />
      </div>
      <Skeleton h={18} w={64} />
    </li>
  );
}

function DealingRow({ d }: { d: McpDealing }) {
  return (
    <li className="border-t border-white/[0.06] first:border-t-0">
      <a
        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
        href={d.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {d.ticker ? (
          <CompanyLogo className="shrink-0" size={36} ticker={d.ticker} />
        ) : (
          <span className="h-9 w-9 shrink-0 rounded-full bg-white/[0.06]" />
        )}
        <span className="min-w-0 flex-1">
          {/* Subject first and heaviest: the company, then the insider, then
              the dates as caption. Nothing here truncates: a name wraps to a
              second line rather than losing its end, and the figure lives in
              its own column so it can never be cut mid-number. */}
          <span className="block text-[14px] font-semibold leading-snug text-white">
            {d.company}
            {d.ticker ? (
              <span className="ml-1.5 font-mono text-[11px] font-medium text-white/40">
                {d.ticker}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-white/60">
            {d.insider.name}
            {d.insider.role ? `, ${d.insider.role}` : ""}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug tabular-nums text-white/40">
            {shortDate(d.trade_date)}, disclosed {shortDate(d.disclosed_date)}
            {d.sector ? ` · ${d.sector}` : ""}
            {d.cluster
              ? ` · ${d.cluster.insiders} insiders in ${d.cluster.window_days} days`
              : ""}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[13.5px] font-semibold leading-none tabular-nums text-white/90">
            <span className="mr-1 text-[11px] font-normal text-white/45">
              {verb(d)}
            </span>
            {valueText(d)}
          </span>
          {d.rating ? <RatingBadge rating={d.rating} /> : null}
        </span>
        <ArrowRightIcon
          aria-hidden
          className="h-4 w-4 shrink-0 text-white/25 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-white/60"
        />
      </a>
    </li>
  );
}

export function LiveSample() {
  const [market, setMarket] = useState<McpMarket>("UK");
  const [states, setStates] = useState<Partial<Record<McpMarket, State>>>({});
  const [attempt, setAttempt] = useState(0);

  const state: State = states[market] ?? { kind: "loading" };

  useEffect(() => {
    // Ready results are kept per market so tabbing back is instant and the
    // connector is not asked the same question twice.
    if (states[market]?.kind === "ready") return;
    const ctrl = new AbortController();
    const t0 = performance.now();

    setStates((s) => ({ ...s, [market]: { kind: "loading" } }));
    searchDealings(market, ROWS, ctrl.signal)
      .then((rows) =>
        setStates((s) => ({
          ...s,
          [market]: {
            kind: "ready",
            rows,
            ms: Math.round(performance.now() - t0),
          },
        })),
      )
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setStates((s) => ({ ...s, [market]: { kind: "failed" } }));
      });

    return () => ctrl.abort();
    // `states` is read, not depended on: re-running on every result would
    // re-issue the in-flight call.
  }, [market, attempt]);

  const meta =
    state.kind === "ready"
      ? `live · ${state.rows.length} rows · ${state.ms} ms`
      : state.kind === "failed"
        ? "no reply"
        : "calling…";

  return (
    <div className="min-w-0">
      <div aria-label="Choose a market" className="mb-3 flex flex-wrap gap-1.5">
        {MARKETS.map((m) => {
          const on = m.id === market;

          return (
            <button
              key={m.id}
              aria-controls="mcp-sample-panel"
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-amber/40 ${
                on
                  ? "border-brand-amber/45 bg-brand-amber/15 text-brand-amber"
                  : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/70"
              }`}
              title={m.label}
              type="button"
              onClick={() => setMarket(m.id)}
            >
              <m.Flag className="h-3 w-4 shrink-0 rounded-[2px]" />
              {m.code}
            </button>
          );
        })}
      </div>

      <Terminal
        meta={meta}
        title={`search_dealings · market ${market}`}
        variant="bare"
      >
        <div id="mcp-sample-panel">
          {state.kind === "loading" ? (
            <ul aria-busy="true" aria-label="Loading filings">
              {Array.from({ length: ROWS }, (_, i) => (
                <RowSkeleton key={i} />
              ))}
            </ul>
          ) : null}

          {state.kind === "failed" ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[14px] font-medium text-white/85">
                Couldn&rsquo;t reach the connector just now.
              </p>
              <p className="mt-1.5 text-[12.5px] leading-[1.5] text-white/50">
                The address above is still right. This is the browser&rsquo;s
                call failing, not the data.
              </p>
              <button
                className="mt-4 rounded-lg bg-white/[0.08] px-3.5 py-2 text-[12.5px] font-semibold text-white/85 transition-colors hover:bg-white/[0.14]"
                type="button"
                onClick={() => setAttempt((a) => a + 1)}
              >
                Try again
              </button>
            </div>
          ) : null}

          {state.kind === "ready" && state.rows.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[14px] font-medium text-white/85">
                Nothing rated in this market on the latest page.
              </p>
              <p className="mt-1.5 text-[12.5px] leading-[1.5] text-white/50">
                The call succeeded and came back empty. Try another market.
              </p>
            </div>
          ) : null}

          {state.kind === "ready" && state.rows.length > 0 ? (
            <ul className="animate-content-in">
              {state.rows.map((d) => (
                <DealingRow key={d.id} d={d} />
              ))}
            </ul>
          ) : null}
        </div>
      </Terminal>

      <p className="mt-3 text-[12.5px] leading-[1.5] text-white/40">
        Fetched from the connector as this page loaded, with the same fields an
        assistant receives. Each row links to its ddbx page, which is where the
        assistant is told to send you for the analysis.
      </p>
    </div>
  );
}
