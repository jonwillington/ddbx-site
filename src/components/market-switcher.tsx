import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { AU, CA } from "country-flag-icons/react/3x2";
import { Drawer } from "vaul";
import clsx from "clsx";

import { useMediaQuery } from "@/lib/use-media-query";
import {
  MARKETS,
  REGION_LABEL,
  REGION_ORDER,
  marketDashboardPath,
  marketHref,
  marketForPath,
  type MarketRegion,
  type MarketRegistryEntry,
} from "@/lib/markets/registry";

const UPCOMING_MARKETS = [
  { code: "CA", label: "Canada", Flag: CA },
  { code: "AU", label: "Australia", Flag: AU },
] as const;

const TRIGGER_CLASS =
  "flex items-center gap-1.5 rounded-full border border-separator/70 bg-surface/60 px-2 py-1 text-sm text-foreground/80 hover:bg-surface transition-colors";

type Section = { region: MarketRegion; markets: MarketRegistryEntry[] };
type ThemeChoice = "light" | "dark";

function currentThemeChoice(): ThemeChoice {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem("theme");

  if (saved === "light" || saved === "dark") return saved;
  if (document.documentElement.classList.contains("dark")) return "dark";

  return "light";
}

function withThemeParam(href: string): string {
  if (typeof window === "undefined") return href;
  try {
    const url = new URL(href, window.location.origin);

    url.searchParams.set("theme", currentThemeChoice());
    // Keep relative links relative for same-origin route hops.
    const relative =
      url.origin === window.location.origin &&
      (href.startsWith("/") || !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href));

    return relative
      ? `${url.pathname}${url.search}${url.hash}`
      : url.toString();
  } catch {
    return href;
  }
}

/** Market picker in the navbar. Desktop gets an anchored dropdown; on
 *  mobile (< lg, matching the filter bar's sheet breakpoint) it opens a
 *  bottom sheet so the options are comfortable tap targets. Both share
 *  the same trigger pill and option list. */
export function MarketSwitcher() {
  const location = useLocation();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const current = marketForPath(location.pathname);
  const sections = useMemo<Section[]>(
    () =>
      REGION_ORDER.map((region) => ({
        region,
        markets: MARKETS.filter((m) => m.region === region && !m.hidden),
      })).filter((s) => s.markets.length > 0),
    [],
  );

  if (!isDesktop) {
    return <MobileSheet current={current} sections={sections} />;
  }

  return <DesktopDropdown current={current} sections={sections} />;
}

function TriggerContent({
  current,
  open,
}: {
  current: MarketRegistryEntry;
  open?: boolean;
}) {
  return (
    <>
      <current.Flag aria-hidden className="h-3.5 w-5 rounded-sm object-cover" />
      <span className="font-medium">{current.label}</span>
      <ChevronDownIcon
        className={clsx("w-3 h-3 transition-transform", open && "rotate-180")}
      />
    </>
  );
}

function DesktopDropdown({
  current,
  sections,
}: {
  current: MarketRegistryEntry;
  sections: Section[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={TRIGGER_CLASS}
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <TriggerContent current={current} open={open} />
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 w-48 rounded-xl border border-separator bg-[#f5f0e8] dark:bg-background shadow-lg overflow-hidden z-50 py-1"
          role="listbox"
        >
          <MarketOptions
            current={current}
            sections={sections}
            onSelect={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function MobileSheet({
  current,
  sections,
}: {
  current: MarketRegistryEntry;
  sections: Section[];
}) {
  const [open, setOpen] = useState(false);
  // On select we keep the sheet open and spin the tapped row while the
  // browser navigates — closing it mid-navigation flashes. Lock dismissal
  // until the new page takes over (this component unmounts on load).
  const [loadingCode, setLoadingCode] = useState<string | null>(null);

  return (
    <Drawer.Root
      dismissible={!loadingCode}
      open={open}
      onOpenChange={(next) => {
        if (!loadingCode) setOpen(next);
      }}
    >
      <Drawer.Trigger asChild>
        <button className={TRIGGER_CLASS} type="button">
          <TriggerContent current={current} />
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Drawer.Content className="fixed bottom-0 inset-x-0 z-50 flex flex-col rounded-t-2xl border-t border-[#e8e0d5] dark:border-separator bg-[#f5f0e8] dark:bg-background outline-none">
          <div className="mx-auto mt-3 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-black/15 dark:bg-white/20" />

          <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 overflow-y-auto">
            <Drawer.Title className="px-2 pb-2 text-base font-semibold">
              Select market
            </Drawer.Title>
            <MarketOptions
              current={current}
              loadingCode={loadingCode}
              sections={sections}
              variant="sheet"
              onSelect={setLoadingCode}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Shared region-grouped option list. `menu` is the compact desktop
 *  dropdown; `sheet` uses roomier tap targets. Each row is a plain link
 *  (full-page navigation); the sheet passes `loadingCode` so the tapped
 *  row spins and the rest freeze until the new page loads. */
function MarketOptions({
  current,
  sections,
  variant = "menu",
  loadingCode,
  onSelect,
}: {
  current: MarketRegistryEntry;
  sections: Section[];
  variant?: "menu" | "sheet";
  /** When set, that market is mid-navigation: spin its row and freeze the
   *  rest so a second tap can't fire while the page loads. */
  loadingCode?: string | null;
  onSelect?: (code: string) => void;
}) {
  const isSheet = variant === "sheet";
  const busy = loadingCode != null;
  const rowClass = isSheet
    ? "flex items-center gap-3 w-full rounded-lg px-2 py-3 text-base hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
    : "flex items-center gap-2 w-full px-2.5 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors";
  const flagClass = isSheet
    ? "h-4 w-6 rounded-sm object-cover"
    : "h-3.5 w-5 rounded-sm object-cover";
  const headingClass = isSheet
    ? "px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/45"
    : "px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/45";
  const dividerClass = isSheet
    ? "my-1.5 border-t border-separator/60"
    : "my-1 border-t border-separator/60";

  return (
    <div aria-busy={busy}>
      {sections.map((section, i) => (
        <Fragment key={section.region}>
          {i > 0 && <div className={dividerClass} />}
          <div className={headingClass}>{REGION_LABEL[section.region]}</div>
          {section.markets.map((m) => {
            const isCurrent = m.code === current.code;
            const isLoading = loadingCode === m.code;
            const href = withThemeParam(marketHref(m, marketDashboardPath(m)));

            return (
              <a
                key={m.code}
                aria-disabled={busy}
                className={clsx(
                  rowClass,
                  busy && "pointer-events-none",
                  busy && !isLoading && "opacity-40",
                )}
                href={href}
                onClick={(e) => {
                  // Ignore taps once something is already navigating.
                  if (busy) {
                    e.preventDefault();

                    return;
                  }
                  onSelect?.(m.code);
                }}
              >
                <m.Flag aria-hidden className={flagClass} />
                <span className="flex-1 text-left">{m.label}</span>
                {isLoading ? (
                  <Spinner className="h-4 w-4 text-foreground/60" />
                ) : (
                  isCurrent && (
                    <CheckIcon className="w-4 h-4 text-foreground/60" />
                  )
                )}
              </a>
            );
          })}
        </Fragment>
      ))}
      <div className={dividerClass} />
      <div className={headingClass}>Coming soon</div>
      {UPCOMING_MARKETS.map((m) => (
        <div
          key={m.code}
          className={clsx(
            rowClass,
            "text-foreground/45 hover:bg-transparent",
            busy && "opacity-40",
          )}
        >
          <m.Flag aria-hidden className={clsx(flagClass, "opacity-70")} />
          <span className="flex-1 text-left">{m.label}</span>
          <span className="text-[10px] uppercase tracking-wider text-foreground/40">
            Soon
          </span>
        </div>
      ))}
    </div>
  );
}

/** Small inline spinner — no shared component exists yet. */
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={clsx("animate-spin", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        fill="currentColor"
      />
    </svg>
  );
}
