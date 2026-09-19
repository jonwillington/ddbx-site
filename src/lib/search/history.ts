/** What the search palette shows before anything is typed: the reader's own
 *  recent searches and recently viewed pages.
 *
 *  localStorage, per browser, and a convenience only — every read and write
 *  is wrapped, because private windows and blocked site data throw, and an
 *  empty history is a fine state to render. Nothing here leaves the device.
 *
 *  Pages are remembered two ways. Entity pages (company, insider, filing)
 *  call `useRememberPage` once their data has arrived, so the entry carries a
 *  real name and ticker rather than a URL. Hub pages are remembered by the
 *  palette's own recorder from the page catalogue. Both write the same list,
 *  keyed on href, newest first. */

import { useEffect } from "react";

export type RecentKind = "company" | "insider" | "filing" | "page";

export interface RecentPage {
  href: string;
  label: string;
  /** Second line: the issuer for an insider, the insider for a filing. */
  sub?: string;
  kind: RecentKind;
  /** Drives the logo; absent on hub pages. */
  ticker?: string;
  /** Market the ticker trades on, for the logo lookup. */
  market?: string;
  at: number;
}

const PAGES_KEY = "ddbx.search.recentPages";
const TERMS_KEY = "ddbx.search.recentTerms";
const MAX_PAGES = 12;
const MAX_TERMS = 8;

/** Fired on every write, so an open palette can re-read. */
export const HISTORY_EVENT = "ddbx:search-history";

function read<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the history simply doesn't persist.
  }
  try {
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    // Non-browser environment.
  }
}

export function readRecentPages(): RecentPage[] {
  return read<RecentPage>(PAGES_KEY).filter(
    (p) => p && typeof p.href === "string" && typeof p.label === "string",
  );
}

export function rememberPage(page: Omit<RecentPage, "at">) {
  if (!page.href || !page.label) return;
  const rest = readRecentPages().filter((p) => p.href !== page.href);

  write(PAGES_KEY, [{ ...page, at: Date.now() }, ...rest].slice(0, MAX_PAGES));
}

export function forgetPage(href: string) {
  write(
    PAGES_KEY,
    readRecentPages().filter((p) => p.href !== href),
  );
}

export function readRecentTerms(): string[] {
  return read<string>(TERMS_KEY).filter((t) => typeof t === "string" && t);
}

export function rememberTerm(term: string) {
  const t = term.trim().replace(/\s+/g, " ");

  if (t.length < 2) return;
  const rest = readRecentTerms().filter(
    (x) => x.toLowerCase() !== t.toLowerCase(),
  );

  write(TERMS_KEY, [t, ...rest].slice(0, MAX_TERMS));
}

export function forgetTerm(term: string) {
  write(
    TERMS_KEY,
    readRecentTerms().filter((x) => x !== term),
  );
}

export function clearHistory() {
  write(PAGES_KEY, []);
  write(TERMS_KEY, []);
}

/** Remember the page the reader is on, once there is something to call it.
 *  Pass null until the data has loaded. The href is the current location, so
 *  a page never has to work out its own canonical URL. */
export function useRememberPage(page: Omit<RecentPage, "at" | "href"> | null) {
  const key = page ? `${page.kind}|${page.label}|${page.sub ?? ""}` : "";

  useEffect(() => {
    if (!page) return;
    rememberPage({ ...page, href: window.location.pathname });
    // Keyed on the content rather than the object, which is rebuilt every
    // render.
  }, [key]);
}
