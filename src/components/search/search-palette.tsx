/** The search palette — ⌘K, "/", or the field at the top of the rail.
 *
 *  One surface for three jobs, in the order a reader has them:
 *
 *  - Going back. Opened empty it is a history, not a blank box: the reader's
 *    recent searches as chips and the pages they last looked at as rows, so
 *    the company they were reading yesterday is one keystroke away.
 *  - Finding a thing. Companies, insiders and pages for the market they are
 *    on, ranked by lib/search/match (exact ticker first, typo-tolerant last),
 *    with the sections ordered by whichever holds the best hit — "biggest
 *    buys" leads with pages, "BARC" with companies.
 *  - One quiet ask. A strip above the key hints says what the app does with
 *    the thing highlighted: follow it and get its next filing pushed. It names
 *    the company or insider under the cursor, which is the moment the pitch is
 *    true of something specific. Desktop clicks go through the app handoff
 *    modal like every other CTA.
 *
 *  Keyboard-first: ↑↓ move, ↵ opens, ⌘↵ opens in a new tab, esc clears then
 *  closes. Rows are real anchors, so middle-click and copy-link work too.
 *
 *  Empty and failed are different states (static-page rule 2): a list that
 *  would not load says so and offers a retry, and pages stay searchable
 *  underneath it. */

import clsx from "clsx";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BellAlertIcon,
  ClockIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { useAppHandoff } from "@/components/app-handoff-modal";
import { CompanyLogo } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { appHrefForMarket } from "@/lib/app-store";
import { displayTicker } from "@/lib/company";
import { marketForPath } from "@/lib/markets/registry";
import {
  type EntityMarket,
  entityMarketFor,
  loadEntityIndex,
  pageCatalogue,
  settledEntityIndex,
  type CompanyHit,
  type EntityIndex,
  type InsiderHit,
  type PageHit,
  type SearchHit,
} from "@/lib/search";
import {
  HISTORY_EVENT,
  clearHistory,
  forgetPage,
  forgetTerm,
  readRecentPages,
  readRecentTerms,
  rememberPage,
  rememberTerm,
  type RecentPage,
} from "@/lib/search/history";
import {
  FUZZY_FLOOR,
  FUZZY_SCORE,
  highlight,
  normalise,
  score,
} from "@/lib/search/match";
import { useDevicePlatform } from "@/lib/use-device-platform";

const LIMIT = { company: 6, insider: 4, page: 4, foreign: 3 } as const;

/** Which other market's lists a search also looks through. SE, NL and KR have
 *  no company or insider pages of their own, so they look through both. */
const FOREIGN: Record<EntityMarket | "none", EntityMarket[]> = {
  uk: ["us"],
  us: ["uk"],
  none: ["uk", "us"],
};

/** Cross-market hits must at least match a whole word of the name, or the
 *  ticker. See score() in lib/search/match for the tiers. */
const FOREIGN_FLOOR = 600;

const marketName = (m: EntityMarket) => `ddbx ${m.toUpperCase()}`;

const SECTION_LABEL: Record<SearchHit["kind"], string> = {
  company: "Companies",
  insider: "Insiders",
  page: "Pages",
};

/** Hub pages worth recording as "recently viewed". The dashboards and the
 *  market/app columns are where a reader starts, not somewhere they return
 *  to by name, and would sit at the top of the list every visit. */
const RECORDED_GROUPS = new Set([
  "Research",
  "Learn",
  "UK platforms",
  "Developers",
]);

const EYEBROW =
  "px-3 pb-1.5 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-foreground/45";

function isMac(): boolean {
  if (typeof navigator === "undefined") return true;

  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

/** Same-origin hrefs as a path (what a page's own useRememberPage writes, so
 *  the two dedupe), anything cross-host kept absolute. */
function localHref(href: string): string {
  try {
    const u = new URL(href, window.location.origin);

    return u.origin === window.location.origin ? u.pathname : u.href;
  } catch {
    return href;
  }
}

function pathOf(href: string): string {
  try {
    return new URL(href, window.location.origin).pathname;
  } catch {
    return href;
  }
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;

  return (
    el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
}

/* ------------------------------------------------------------------------ */
/* Launcher: the rail field, the shortcuts, the recorder, the palette.       */
/* ------------------------------------------------------------------------ */

export function SearchLauncher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const market = marketForPath(location.pathname);
  const mac = useMemo(isMac, []);

  // ⌘K / Ctrl+K toggles from anywhere; "/" opens when the reader isn't
  // already typing in something.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Any navigation closes it — including one a logo inside a row took.
  useEffect(() => setOpen(false), [location.pathname]);

  // Hub pages go into "recently viewed" as the reader reaches them, however
  // they got there. Entity pages record themselves (useRememberPage) once
  // they know the name.
  useEffect(() => {
    const page = pageCatalogue(location.pathname, market).find(
      (p) => pathOf(p.href) === location.pathname,
    );

    if (page && RECORDED_GROUPS.has(page.group)) {
      rememberPage({
        href: location.pathname,
        kind: "page",
        label: page.name,
        sub: page.group,
      });
    }
  }, [location.pathname]);

  // Warm the lists on intent, so the first keystroke rarely waits.
  const entityMarket = entityMarketFor(market.id);
  const warm = useCallback(() => {
    if (entityMarket) loadEntityIndex(entityMarket).catch(() => {});
  }, [entityMarket]);

  // One handoff per app: a US company highlighted from ddbx.uk is sold the
  // US app, not the UK one. The home market keeps its own id (Congress and
  // Trump Media resolve to the US listing inside appHrefForMarket).
  const platform = useDevicePlatform();
  const homeApp: EntityMarket = entityMarket ?? "uk";
  const awayApp: EntityMarket = homeApp === "uk" ? "us" : "uk";
  const homeHandoff = useAppHandoff(
    market.id,
    appHrefForMarket(market.id, platform),
    `Search ${market.id}`,
  );
  const awayHandoff = useAppHandoff(
    awayApp,
    appHrefForMarket(awayApp, platform),
    `Search ${market.id} to ${awayApp}`,
  );
  const handoffs = {
    [homeApp]: homeHandoff,
    [awayApp]: awayHandoff,
  } as Record<EntityMarket, Handoff>;

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
        className={clsx(
          "group flex w-full items-center gap-2.5 rounded-lg border border-black/[0.07] bg-white/55 px-2.5 py-[6px] text-left text-[13px] text-foreground/50 shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-colors hover:border-black/[0.12] hover:bg-white/80 hover:text-foreground/70 dark:border-white/[0.07] dark:bg-white/[0.04] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.07]",
          className,
        )}
        data-ga-event="search_open"
        data-ga-label={`Sidebar ${market.id}`}
        type="button"
        onClick={() => setOpen(true)}
        onFocus={warm}
        onMouseEnter={warm}
      >
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 opacity-70" />
        <span className="flex-1">Search</span>
        <Kbd>{mac ? "⌘K" : "Ctrl K"}</Kbd>
      </button>
      {open && (
        <SearchPalette handoffs={handoffs} onClose={() => setOpen(false)} />
      )}
      {homeHandoff.modal}
      {awayHandoff.modal}
    </>
  );
}

function Kbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={clsx(
        "inline-flex min-w-[20px] items-center justify-center rounded-[5px] border border-black/[0.09] bg-white/70 px-1 font-sans text-[10.5px] font-medium leading-[18px] text-foreground/50 dark:border-white/10 dark:bg-white/[0.06]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/* ------------------------------------------------------------------------ */
/* The palette.                                                              */
/* ------------------------------------------------------------------------ */

/** One selectable row, whatever section it sits in. */
interface Item {
  id: string;
  href: string;
  /** What the app strip talks about while this row is highlighted. */
  subject?: {
    kind: "company" | "insider";
    name: string;
    ticker: string;
    /** The market it files in — picks which app the strip sells. */
    market?: string;
  };
  render: (active: boolean) => ReactNode;
  /** Remembered on select as a recent page. */
  remember?: Omit<RecentPage, "at">;
  /** Chips fill the query rather than navigating. */
  fill?: string;
}

interface Section {
  key: string;
  label: string;
  action?: ReactNode;
  layout?: "chips";
  items: Item[];
}

type IndexState =
  | { status: "none" }
  | { status: "loading" }
  | { status: "ready"; index: EntityIndex }
  | { status: "failed" };

type Handoff = ReturnType<typeof useAppHandoff>;

function SearchPalette({
  onClose,
  handoffs,
}: {
  onClose: () => void;
  handoffs: Record<EntityMarket, Handoff>;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const market = marketForPath(location.pathname);
  const entityMarket = entityMarketFor(market.id);
  const mac = useMemo(isMac, []);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const q = normalise(query);
  const [active, setActive] = useState(0);
  const [pointer, setPointer] = useState(false);
  const [history, setHistory] = useState(() => ({
    pages: readRecentPages(),
    terms: readRecentTerms(),
  }));
  const [idx, setIdx] = useState<IndexState>(() => {
    if (!entityMarket) return { status: "none" };
    const ready = settledEntityIndex(entityMarket);

    return ready ? { status: "ready", index: ready } : { status: "loading" };
  });

  const load = useCallback(() => {
    if (!entityMarket) return;
    let live = true;

    setIdx((s) => (s.status === "ready" ? s : { status: "loading" }));
    loadEntityIndex(entityMarket)
      .then((index) => live && setIdx({ status: "ready", index }))
      .catch(() => live && setIdx({ status: "failed" }));

    return () => {
      live = false;
    };
  }, [entityMarket]);

  useEffect(() => load(), [load]);

  // The other market's lists, so a UK reader typing "microsoft" still finds
  // it — as a link across to ddbx US rather than an empty result. Fetched on
  // the first keystroke, not on open: most opens are for the home market.
  const foreignMarkets = FOREIGN[entityMarket ?? "none"];
  const [foreign, setForeign] = useState<
    Partial<Record<EntityMarket, EntityIndex>>
  >(() =>
    Object.fromEntries(
      foreignMarkets.flatMap((m) => {
        const ready = settledEntityIndex(m);

        return ready ? [[m, ready]] : [];
      }),
    ),
  );
  const typed = q.length > 0;

  useEffect(() => {
    if (!typed) return;
    let live = true;

    for (const m of foreignMarkets) {
      if (foreign[m]) continue;
      loadEntityIndex(m)
        .then((index) => live && setForeign((f) => ({ ...f, [m]: index })))
        .catch(() => {
          // Cross-market results are a bonus; the home results stand alone.
        });
    }

    return () => {
      live = false;
    };
  }, [typed, entityMarket]);

  useEffect(() => {
    const sync = () =>
      setHistory({ pages: readRecentPages(), terms: readRecentTerms() });

    window.addEventListener(HISTORY_EVENT, sync);

    return () => window.removeEventListener(HISTORY_EVENT, sync);
  }, []);

  // Scroll lock + focus, restored on close.
  useEffect(() => {
    const prev = document.body.style.overflow;
    const opener = document.activeElement as HTMLElement | null;

    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    return () => {
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, []);

  const pages = useMemo(
    () => pageCatalogue(location.pathname, market),

    [location.pathname, market.id],
  );

  /* ---------------- sections ---------------- */

  const sections: Section[] = useMemo(() => {
    if (!q) return emptyStateSections();

    const scoreAll = <T extends SearchHit>(list: T[]) =>
      list
        .map((h) => ({ h, s: score(q, h.s) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || b.h.weight - a.h.weight);
    const scored = {
      company: idx.status === "ready" ? scoreAll(idx.index.companies) : [],
      insider: idx.status === "ready" ? scoreAll(idx.index.insiders) : [],
      page: scoreAll(pages),
    };
    // Typo matches only when nothing real matched, anywhere.
    const strong = Object.values(scored).some(
      (l) => (l[0]?.s ?? 0) >= FUZZY_FLOOR,
    );
    const ranked = <T extends SearchHit>(
      list: { h: T; s: number }[],
      limit: number,
    ) =>
      (strong ? list.filter((x) => x.s > FUZZY_SCORE) : list).slice(0, limit);

    const groups: { kind: SearchHit["kind"]; top: number; items: Item[] }[] =
      [];
    const push = <T extends SearchHit>(
      kind: T["kind"],
      hits: { h: T; s: number }[],
      toItem: (h: T) => Item,
    ) => {
      if (hits.length)
        groups.push({
          kind,
          top: hits[0].s + hits[0].h.weight / 100,
          items: hits.map((x) => toItem(x.h)),
        });
    };

    push("company", ranked(scored.company, LIMIT.company), companyItem);
    push("insider", ranked(scored.insider, LIMIT.insider), insiderItem);
    push("page", ranked(scored.page, LIMIT.page), pageItem);

    const out: (Section & { top: number })[] = groups.map((g) => ({
      key: g.kind,
      label: SECTION_LABEL[g.kind],
      items: g.items,
      top: g.top,
    }));

    // The other market, one section per market, companies before insiders.
    // Only name and ticker matches (FOREIGN_FLOOR): initials, a company's
    // insiders and typos are fine at home and noise from across the water.
    // Ranked with everything else, less a nudge so a tie goes to home.
    for (const m of foreignMarkets) {
      const index = foreign[m];

      if (!index) continue;
      const cos = scoreAll(index.companies).filter((x) => x.s >= FOREIGN_FLOOR);
      const ins = scoreAll(index.insiders).filter((x) => x.s >= FOREIGN_FLOOR);
      const items = [
        ...cos.slice(0, LIMIT.foreign).map((x) => companyItem(x.h, m)),
        ...ins
          .slice(0, Math.max(1, LIMIT.foreign - cos.length))
          .map((x) => insiderItem(x.h, m)),
      ].slice(0, LIMIT.foreign + 1);

      if (!items.length) continue;
      const best = Math.max(cos[0]?.s ?? 0, ins[0]?.s ?? 0);

      out.push({
        key: `foreign-${m}`,
        label: `On ${marketName(m)}`,
        items,
        top: best - 30,
      });
    }

    // Whichever section holds the best hit leads.
    out.sort((a, b) => b.top - a.top);

    return out;
  }, [q, idx, pages, history, foreign]);

  function emptyStateSections(): Section[] {
    const out: Section[] = [];

    if (history.terms.length) {
      out.push({
        key: "terms",
        label: "Recent searches",
        layout: "chips",
        items: history.terms.slice(0, 6).map((t) => ({
          id: `t:${t}`,
          href: "#",
          fill: t,
          render: (a) => (
            <TermChip active={a} term={t} onForget={() => forgetTerm(t)} />
          ),
        })),
      });
    }

    const recent = history.pages.slice(0, 6);

    if (recent.length) {
      out.push({
        key: "recent",
        label: "Recently viewed",
        action: (
          <button
            className="rounded px-1 text-[11px] font-medium normal-case tracking-normal text-foreground/45 hover:text-foreground/80"
            data-ga-event="search_clear_history"
            type="button"
            onClick={() => clearHistory()}
          >
            Clear
          </button>
        ),
        items: recent.map(recentItem),
      });
    }

    // Starting points. Fewer once there is history to lead with.
    const jump = pages
      .filter((p) => p.group === "Research" || p.group === "Learn")
      .sort((a, b) => b.weight - a.weight)
      .slice(0, recent.length ? 3 : 5);

    if (jump.length)
      out.push({ key: "jump", label: "Jump to", items: jump.map(pageItem) });

    // First visit: what's moving, so the empty palette is never empty.
    if (!recent.length && idx.status === "ready") {
      const busy = [...idx.index.companies]
        .sort(
          (a, b) =>
            (b.lastTrade ?? "").localeCompare(a.lastTrade ?? "") ||
            b.weight - a.weight,
        )
        .slice(0, 4);

      if (busy.length)
        out.push({
          key: "busy",
          label: "Recently active",
          items: busy.map((h) => companyItem(h)),
        });
    }

    return out;
  }

  /* ---------------- item builders ---------------- */

  function companyItem(h: CompanyHit, away?: EntityMarket): Item {
    return {
      id: h.id,
      href: h.href,
      subject: {
        kind: "company",
        name: h.name,
        ticker: h.ticker,
        market: h.market,
      },
      remember: {
        href: localHref(h.href),
        kind: "company",
        label: h.name,
        ticker: h.key,
        market: h.market,
      },
      render: (a) => (
        <Row
          active={a}
          lead={<CompanyLogo market={h.market} size={28} ticker={h.key} />}
          meta={
            away ? (
              <AwayTag market={away} />
            ) : (
              `${h.deals} ${h.deals === 1 ? "deal" : "deals"}`
            )
          }
          title={
            <>
              <Hl q={query} text={h.name} />
              <TickerPill className="ml-2 align-[1px]" ticker={h.ticker} />
            </>
          }
        />
      ),
    };
  }

  function insiderItem(h: InsiderHit, away?: EntityMarket): Item {
    return {
      id: h.id,
      href: h.href,
      subject: {
        kind: "insider",
        name: h.name,
        ticker: h.ticker,
        market: h.market,
      },
      remember: {
        href: localHref(h.href),
        kind: "insider",
        label: h.name,
        sub: h.company,
        ticker: h.ticker,
        market: h.market,
      },
      render: (a) => (
        <Row
          active={a}
          lead={<IconTile icon={UserIcon} />}
          meta={
            away ? (
              <AwayTag market={away} />
            ) : (
              `${h.buys} ${h.buys === 1 ? "buy" : "buys"}`
            )
          }
          sub={<Hl q={query} text={h.company} />}
          title={<Hl q={query} text={h.name} />}
        />
      ),
    };
  }

  function pageItem(h: PageHit): Item {
    return {
      id: h.id,
      href: h.href,
      render: (a) => (
        <Row
          active={a}
          lead={<IconTile icon={DocumentTextIcon} />}
          meta={h.group}
          title={<Hl q={query} text={h.name} />}
        />
      ),
    };
  }

  function recentItem(p: RecentPage): Item {
    const pm = entityMarketFor(String(p.market ?? "").toLowerCase());
    const away = pm && entityMarket && pm !== entityMarket ? pm : undefined;
    const lead =
      p.ticker && (p.kind === "company" || p.kind === "filing") ? (
        <CompanyLogo market={p.market} size={28} ticker={p.ticker} />
      ) : (
        <IconTile icon={p.kind === "insider" ? UserIcon : ClockIcon} />
      );

    return {
      id: `r:${p.href}`,
      href: p.href,
      subject:
        p.kind === "company" || p.kind === "insider"
          ? {
              kind: p.kind,
              name: p.label,
              ticker: displayTicker(p.ticker ?? ""),
              market: p.market,
            }
          : undefined,
      remember: p,
      render: (a) => (
        <Row
          active={a}
          lead={lead}
          meta={away ? <AwayTag market={away} /> : KIND_LABEL[p.kind]}
          sub={p.sub}
          title={p.label}
          onForget={() => forgetPage(p.href)}
        />
      ),
    };
  }

  /* ---------------- navigation ---------------- */

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const current = flat[Math.min(active, flat.length - 1)];

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    if (pointer || !current) return;
    listRef.current
      ?.querySelector(`[data-item="${CSS.escape(current.id)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [current, pointer]);

  const select = (item: Item, newTab = false) => {
    if (item.fill != null) {
      setQuery(item.fill);
      inputRef.current?.focus();

      return;
    }
    if (query.trim()) rememberTerm(query);
    if (item.remember) rememberPage(item.remember);
    try {
      window.gtag?.("event", "search_select", {
        result_kind: item.id.split(":")[0],
        has_query: query.trim() ? "yes" : "no",
      });
    } catch {
      // Analytics off.
    }
    if (newTab) {
      window.open(item.href, "_blank", "noopener");

      return;
    }
    onClose();
    if (item.href.startsWith("/")) navigate(item.href);
    else window.location.assign(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      setPointer(false);
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      setPointer(false);
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (current) select(current, e.metaKey || e.ctrlKey);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query) setQuery("");
      else onClose();
    } else if (e.key === "Tab") {
      // Focus stays in the field; the list is driven by the arrows.
      e.preventDefault();
    }
  };

  /* ---------------- body states ---------------- */

  let body: ReactNode;
  const loadingEntities = q && idx.status === "loading";

  if (flat.length === 0 && !q) {
    body = <EmptyHint />;
  } else if (flat.length === 0 && loadingEntities) {
    body = <LoadingRows />;
  } else if (flat.length === 0) {
    body = (
      <NoResults
        browse={entityMarket != null}
        failed={idx.status === "failed"}
        query={query.trim()}
        onBrowse={onClose}
        onRetry={load}
      />
    );
  } else {
    let n = -1;

    body = (
      <>
        {sections.map((s) => (
          <div key={s.key} aria-label={s.label} role="group">
            <div className={clsx(EYEBROW, "flex items-center justify-between")}>
              <span>{s.label}</span>
              {s.action}
            </div>
            <div
              className={clsx(
                s.layout === "chips"
                  ? "flex flex-wrap gap-1.5 px-3 pb-2"
                  : "px-1.5",
              )}
            >
              {s.items.map((item) => {
                n += 1;
                const i = n;
                const isActive = i === active;

                if (item.fill != null) {
                  return (
                    <div
                      key={item.id}
                      aria-selected={isActive}
                      className="cursor-pointer rounded-full outline-none"
                      data-item={item.id}
                      id={`${listId}-${i}`}
                      role="option"
                      tabIndex={-1}
                      onClick={() => select(item)}
                      onKeyDown={(e) => e.key === "Enter" && select(item)}
                      onMouseMove={() => {
                        setPointer(true);
                        if (!isActive) setActive(i);
                      }}
                    >
                      {item.render(isActive)}
                    </div>
                  );
                }

                return (
                  <a
                    key={item.id}
                    aria-selected={isActive}
                    className="block outline-none"
                    data-item={item.id}
                    href={item.href}
                    id={`${listId}-${i}`}
                    role="option"
                    onClick={(e) => {
                      if (
                        e.metaKey ||
                        e.ctrlKey ||
                        e.shiftKey ||
                        e.button === 1
                      )
                        return;
                      e.preventDefault();
                      select(item);
                    }}
                    onMouseMove={() => {
                      setPointer(true);
                      if (!isActive) setActive(i);
                    }}
                  >
                    {item.render(isActive)}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
        {loadingEntities && <LoadingRows compact />}
        {q && idx.status === "failed" && <FailedNote onRetry={load} />}
      </>
    );
  }

  // The strip sells the app the highlighted thing lives in.
  const stripApp: EntityMarket =
    entityMarketFor(String(current?.subject?.market ?? "").toLowerCase()) ??
    entityMarket ??
    "uk";
  const activeIndex = flat.length ? Math.min(active, flat.length - 1) : -1;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-center px-4 pt-[min(14vh,120px)]">
      <button
        aria-label="Close search"
        className="animate-search-backdrop absolute inset-0 cursor-default bg-[#1a140e]/35 backdrop-blur-[2px] dark:bg-black/60"
        tabIndex={-1}
        type="button"
        onClick={onClose}
      />
      <div
        aria-label="Search"
        aria-modal="true"
        className="animate-search-in relative flex max-h-[min(640px,calc(100vh-min(14vh,120px)-32px))] w-full max-w-[640px] flex-col self-start overflow-hidden rounded-[16px] border border-black/[0.09] bg-background shadow-[0_28px_90px_-20px_rgba(40,28,16,0.45),0_2px_6px_rgba(40,28,16,0.06)] dark:border-white/10 dark:shadow-[0_28px_90px_-20px_rgba(0,0,0,0.8)]"
        role="dialog"
      >
        {/* Field */}
        <div className="flex h-[56px] shrink-0 items-center gap-3 border-b border-black/[0.07] px-4 dark:border-separator">
          <MagnifyingGlassIcon className="h-[18px] w-[18px] shrink-0 text-foreground/45" />
          <input
            ref={inputRef}
            aria-expanded
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
            }
            aria-autocomplete="list"
            aria-controls={listId}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-foreground/35"
            enterKeyHint="go"
            placeholder={
              entityMarket
                ? `Search ${market.label} companies, insiders and pages`
                : "Search pages"
            }
            role="combobox"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {query ? (
            <button
              aria-label="Clear search"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-foreground/55 hover:bg-black/[0.1] hover:text-foreground dark:bg-white/[0.08] dark:hover:bg-white/[0.14]"
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              className="shrink-0"
              tabIndex={-1}
              type="button"
              onClick={onClose}
            >
              <Kbd>esc</Kbd>
            </button>
          )}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2"
          id={listId}
          role="listbox"
        >
          {body}
        </div>

        {/* The ask */}
        {entityMarket && (
          <AppStrip
            handoff={handoffs[stripApp]}
            marketId={stripApp === entityMarket ? market.id : stripApp}
            subject={current?.subject}
            onClose={onClose}
          />
        )}

        {/* Key hints */}
        <div className="hidden h-9 shrink-0 items-center gap-4 border-t border-black/[0.07] px-4 text-[11px] text-foreground/45 dark:border-separator sm:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            to move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            to open
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>{mac ? "⌘↵" : "Ctrl ↵"}</Kbd>
            new tab
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Kbd>esc</Kbd>
            to close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------------ */
/* Pieces.                                                                   */
/* ------------------------------------------------------------------------ */

const KIND_LABEL: Record<RecentPage["kind"], string> = {
  company: "Company",
  insider: "Insider",
  filing: "Filing",
  page: "Page",
};

function Hl({ text, q }: { text: string; q: string }) {
  return (
    <>
      {highlight(text, q).map((r, i) =>
        r.hit ? (
          <mark
            key={i}
            className="bg-transparent font-semibold text-[#5a4128] dark:text-[#e2cdb6]"
          >
            {r.text}
          </mark>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

/** "View in ddbx US ↗" — the row leaves this site for the other market's. */
function AwayTag({ market }: { market: EntityMarket }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.09] px-2 py-[1px] text-[11px] font-medium text-foreground/60 dark:border-white/[0.12]">
      View in {marketName(market)}
      <ArrowUpRightIcon className="h-3 w-3" />
    </span>
  );
}

function IconTile({ icon: Icon }: { icon: typeof UserIcon }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-foreground/55 dark:bg-white/[0.07]">
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function Row({
  active,
  lead,
  title,
  sub,
  meta,
  onForget,
}: {
  active: boolean;
  lead: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  meta?: ReactNode;
  onForget?: () => void;
}) {
  return (
    <div
      className={clsx(
        "group/row flex min-h-[46px] items-center gap-3 rounded-[10px] px-2.5 py-1.5",
        active ? "bg-[#fcfbf9] dark:bg-white/[0.07]" : "",
      )}
    >
      {lead}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] leading-[1.35] text-foreground">
          {title}
        </div>
        {sub ? (
          <div className="truncate text-[12px] leading-[1.35] text-foreground/50">
            {sub}
          </div>
        ) : null}
      </div>
      {meta ? (
        <span
          className={clsx(
            "shrink-0 text-[11.5px] tabular-nums text-foreground/40",
            active && onForget && "hidden",
          )}
        >
          {meta}
        </span>
      ) : null}
      {onForget && active ? (
        <button
          aria-label="Remove from recent"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-foreground/40 hover:bg-black/[0.07] hover:text-foreground dark:hover:bg-white/[0.1]"
          tabIndex={-1}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onForget();
          }}
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <Kbd className={clsx("shrink-0", !active && "invisible")}>↵</Kbd>
    </div>
  );
}

function TermChip({
  term,
  active,
  onForget,
}: {
  term: string;
  active: boolean;
  onForget: () => void;
}) {
  return (
    <span
      className={clsx(
        "group/chip inline-flex items-center gap-1.5 rounded-full border py-[3px] pl-2.5 pr-1 text-[12.5px] transition-colors",
        active
          ? "border-[#d9c9b3] bg-[#fcfbf9] text-[#5a4128] dark:border-white/20 dark:bg-white/[0.08] dark:text-[#e2cdb6]"
          : "border-black/[0.08] text-foreground/70 dark:border-white/10",
      )}
    >
      <ClockIcon className="h-3 w-3 opacity-60" />
      {term}
      <button
        aria-label={`Remove “${term}” from recent searches`}
        className="flex h-4 w-4 items-center justify-center rounded-full opacity-40 hover:bg-black/[0.08] hover:opacity-100 dark:hover:bg-white/[0.12]"
        tabIndex={-1}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onForget();
        }}
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </span>
  );
}

function AppStrip({
  subject,
  marketId,
  handoff,
  onClose,
}: {
  subject?: Item["subject"];
  marketId: string;
  handoff: ReturnType<typeof useAppHandoff>;
  onClose: () => void;
}) {
  const { onClick, ...anchor } =
    handoff.anchorProps as typeof handoff.anchorProps & {
      onClick?: (e: React.MouseEvent) => void;
    };
  const app =
    marketId === "uk" || marketId === "us"
      ? `the ${marketName(marketId)} app`
      : "the app";
  const line = !subject ? (
    <>Every new filing, pushed to your phone the day it lands.</>
  ) : subject.kind === "company" ? (
    <>
      Follow{" "}
      <span className="font-medium text-foreground/85">
        {subject.ticker || subject.name}
      </span>{" "}
      in {app} and get its next filing pushed to you.
    </>
  ) : (
    <>
      Follow{" "}
      <span className="font-medium text-foreground/85">{subject.name}</span> in{" "}
      {app} and get their next buy pushed to you.
    </>
  );

  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-black/[0.07] bg-black/[0.02] px-4 py-2.5 dark:border-separator dark:bg-white/[0.03]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#5a4128] shadow-[0_1px_2px_rgba(90,65,40,0.12)] dark:bg-white/[0.08] dark:text-[#e2cdb6]">
        <BellAlertIcon className="h-3.5 w-3.5" />
      </span>
      <p className="min-w-0 flex-1 truncate text-[12.5px] text-foreground/60">
        {line}
      </p>
      <a
        className={`inline-flex shrink-0 items-center gap-1 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-2.5 py-1 text-[12px] font-medium`}
        data-ga-event="cta_search_get_app"
        data-ga-label={`Search ${marketId}${subject ? ` · ${subject.kind}` : ""}`}
        rel="noopener noreferrer"
        target="_blank"
        {...anchor}
        href={anchor.href}
        onClick={(e) => {
          if (!onClick) return;
          onClose();
          onClick(e);
        }}
      >
        Get the app
        <ArrowRightIcon className="h-3 w-3" />
      </a>
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-[14px] text-foreground/70">
        Search by company, ticker or insider.
      </p>
      <p className="mt-1 text-[12.5px] text-foreground/45">
        Pages you visit will show up here.
      </p>
    </div>
  );
}

function LoadingRows({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-label="Loading companies and insiders"
      className="px-1.5"
      role="status"
    >
      {!compact && <div className={EYEBROW}>Companies</div>}
      {Array.from({ length: compact ? 2 : 4 }, (_, i) => (
        <div
          key={i}
          className="flex min-h-[46px] items-center gap-3 px-2.5 py-1.5"
        >
          <span className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.07]" />
          <span
            className="h-3 animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.07]"
            style={{ width: `${[46, 34, 52, 40][i % 4]}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function FailedNote({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="mx-4 mt-2 rounded-lg bg-black/[0.03] px-3 py-2 text-[12.5px] text-foreground/60 dark:bg-white/[0.04]">
      We couldn’t load companies and insiders just now, so only pages are
      searched.{" "}
      <button
        className="font-medium text-foreground underline underline-offset-2"
        type="button"
        onClick={onRetry}
      >
        Try again
      </button>
    </p>
  );
}

function NoResults({
  query,
  browse,
  failed,
  onRetry,
  onBrowse,
}: {
  query: string;
  browse: boolean;
  failed: boolean;
  onRetry: () => void;
  onBrowse: () => void;
}) {
  if (failed) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-[14px] text-foreground/75">
          Nothing in pages for “{query}”.
        </p>
        <FailedNote onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="px-6 py-10 text-center">
      <p className="text-[14px] text-foreground/75">
        No matches for “{query}”.
      </p>
      {browse && (
        <p className="mx-auto mt-1 max-w-[40ch] text-[12.5px] leading-[1.55] text-foreground/45">
          Try a ticker, part of a company name or an insider’s surname. We
          list UK and US companies where an insider has bought shares on the
          open market.
        </p>
      )}
      {browse && (
        <Link
          className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-[#5a4128] hover:underline dark:text-[#e2cdb6]"
          to="/companies"
          onClick={onBrowse}
        >
          Browse every company
          <ArrowRightIcon className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
