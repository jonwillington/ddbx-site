import type { Rating } from "@/types/ddbx";

/** The ddbx MCP connector, as the /mcp page calls it from the browser.
 *
 *  One address, no key, open CORS: `POST https://api.ddbx.uk/mcp` speaking
 *  JSON-RPC over Streamable HTTP. The server is stateless and answers every
 *  tool here in one JSON body, so a `tools/call` is a single fetch with no
 *  session dance. The page uses it for exactly one thing: rendering a
 *  GENUINE response in the hero, because a page selling "here is what your
 *  assistant sees" cannot show a mocked payload without arguing against
 *  itself.
 *
 *  The types below mirror `McpDealing` in ddbx-data/worker/mcp.ts (the thin
 *  tier: who, what, when, how much, the rating LABEL, sector, cluster, and a
 *  url to the ddbx page). Tool and field names are a public contract once
 *  assistants cache them, so a change there is an additive change here too.
 */

export const MCP_URL = "https://api.ddbx.uk/mcp";

export type McpMarket = "UK" | "US" | "SE" | "NL" | "USG";

export interface McpDealing {
  id: string;
  market: McpMarket;
  url: string;
  ticker: string | null;
  company: string;
  insider: { name: string; role: string | null };
  side: "buy" | "sell" | null;
  transaction: string;
  trade_date: string;
  disclosed_date: string;
  shares: number | null;
  price: number | null;
  value: number | null;
  /** Congress only: the disclosed band. */
  value_range?: { min: number | null; max: number | null };
  currency: string;
  rating: Rating | null;
  sector: string | null;
  cluster: {
    tier: string;
    insiders: number;
    window_days: number;
  } | null;
}

interface SearchResult {
  market: McpMarket;
  count: number;
  dealings: McpDealing[];
}

interface RpcEnvelope {
  result?: {
    isError?: boolean;
    structuredContent?: unknown;
    content?: { type: string; text?: string }[];
  };
  error?: { code: number; message: string };
}

/** `tools/call` for search_dealings, unwrapped. Throws on transport or RPC
 *  failure so the caller can tell "the connector is down" from "the market has
 *  nothing rated", which the static-page rules require it to render as two
 *  different states. */
export async function searchDealings(
  market: McpMarket,
  limit: number,
  signal?: AbortSignal,
): Promise<McpDealing[]> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      // The transport insists on both: JSON for the one-shot reply this
      // server sends, the event-stream type because the spec allows either.
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "search_dealings", arguments: { market, limit } },
    }),
  });

  if (!res.ok) throw new Error(`MCP ${res.status}`);
  const body = (await res.json()) as RpcEnvelope;

  if (body.error) throw new Error(body.error.message);
  if (!body.result || body.result.isError) throw new Error("tool error");

  // Prefer the structured copy; fall back to the text copy of the same JSON.
  const data =
    body.result.structuredContent ??
    JSON.parse(
      body.result.content?.find((c) => c.type === "text")?.text ?? "{}",
    );

  return (data as SearchResult).dealings ?? [];
}

// ---- Presentation -----------------------------------------------------------

const SYMBOL: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };

/** "£81k", "$1.0m", "SEK 236k". Mirrors `money` in the worker's own text
 *  rendering, so what the page shows is what a text-only assistant reads. */
export function formatMoney(
  amount: number | null,
  currency: string,
): string | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  const sym = SYMBOL[currency] ?? `${currency} `;
  const abs = Math.abs(amount);
  const body =
    abs >= 1e9
      ? `${(abs / 1e9).toFixed(1)}bn`
      : abs >= 1e6
        ? `${(abs / 1e6).toFixed(1)}m`
        : abs >= 1e3
          ? `${Math.round(abs / 1e3)}k`
          : abs.toFixed(0);

  return `${sym}${body}`;
}

/** The value a row is worth, in words the reader can say: an exact figure, a
 *  Congress band, or an honest "undisclosed". Never a dash in the slot. */
export function valueText(d: McpDealing): string {
  if (d.value_range) {
    const lo = formatMoney(d.value_range.min, d.currency);
    const hi = formatMoney(d.value_range.max, d.currency);

    if (lo && hi) return `${lo}-${hi}`;
    if (lo) return `over ${lo}`;

    return "undisclosed amount";
  }

  return formatMoney(d.value, d.currency) ?? "undisclosed amount";
}

/** "10 Sep" for a same-year date, "10 Sep 2025" otherwise. */
export function shortDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(d.getTime())) return iso;
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}
