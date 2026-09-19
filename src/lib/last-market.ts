/** The market dashboard this visitor was last on, so pages that belong to no
 *  market (/api, /mcp) can open their per-market previews on the one they came
 *  from — a Swedish reader who clicks through to /mcp sees Sweden's sample,
 *  not the UK's.
 *
 *  Session-scoped on purpose: it answers "where did I just come from", not a
 *  standing preference. Storage can be absent or throw (private windows,
 *  blocked site data), so every read and write is guarded and callers get
 *  `undefined` and fall back to their default. */
const KEY = "ddbx.lastMarket";

export function rememberMarket(id: string): void {
  try {
    window.sessionStorage.setItem(KEY, id);
  } catch {
    // No storage: the previews fall back to their default tab.
  }
}

export function lastMarketId(): string | undefined {
  try {
    return window.sessionStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
