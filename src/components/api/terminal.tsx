import type { ReactNode } from "react";

/** The page's signature object: a response/request panel in the site's own
 *  palette.
 *
 *  Two deliberate departures from stock developer-docs styling:
 *
 *  1. **No macOS traffic lights.** The site does no skeuomorphism anywhere, and
 *     three coloured dots are the single most generic thing a code block can
 *     wear. The header instead reuses SectionHeader's grammar — mono uppercase
 *     kicker left, mono tabular counter right — transposed onto dark, so the
 *     object reads as ddbx rather than as a widget lifted from a docs theme.
 *
 *  2. **No highlight library, and no cold hues.** The palette contains zero
 *     blue/violet/cyan, so every stock theme (Prism, Shiki defaults, Dracula)
 *     looks pasted in. Tokens are coloured from the brand family only — see
 *     TOKEN below. Shipping a highlighter for a handful of static snippets
 *     would also be a lot of bytes for no gain.
 *
 *  Green is NOT used as a syntax colour. `--positive`/`--negative` mean money
 *  moved, everywhere on the site; spending green on "this is a number" would
 *  break that read. The one exception is an explicitly directional value, via
 *  `<Tok kind="gain">`.
 */

/** Brand-family syntax palette. Keys sit quietest, string values carry the
 *  amber that the dark bands already use for kickers, numbers step warmer. */
const TOKEN = {
  key: "text-[#ad9479]",
  string: "text-[#eec584]",
  number: "text-[#e8a878]",
  keyword: "text-[#d8b48c]",
  punct: "text-white/40",
  comment: "text-white/35",
  /** Directional only — a return/alpha figure, where green is honest. */
  gain: "text-[#5cd84a]",
  /** The other half of directional. Matches the dark `--negative` token. */
  loss: "text-[oklch(64%_0.185_25)]",
} as const;

export type TokenKind = keyof typeof TOKEN;

export function Tok({
  kind,
  children,
}: {
  kind: TokenKind;
  children: ReactNode;
}) {
  return <span className={TOKEN[kind]}>{children}</span>;
}

/** Body treatments. `code` is the default and what the name implies: padded,
 *  monospaced, horizontally scrollable. `bare` hands the whole body to the
 *  child with no padding and no font override, for panels that hold something
 *  other than text (the accumulation chart's SVG plus its readout rows, which
 *  own their own edge-to-edge rules). Kept as a variant rather than an
 *  overriding className because `p-0` and `p-4` are the same Tailwind utility
 *  and which one wins is a stylesheet-order coin flip. */
const BODY_VARIANT = {
  code: "overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.6] text-[#f5f0e8]/90",
  bare: "text-[#f5f0e8]/90",
} as const;

/** Panel chrome. `title` is the left kicker (e.g. `GET /api/dealings`),
 *  `meta` the right-hand counter (e.g. `200 OK · 142 ms`). */
export function Terminal({
  title,
  meta,
  children,
  className = "",
  bodyClassName = "",
  variant = "code",
}: {
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: keyof typeof BODY_VARIANT;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-[oklch(15%_0.018_55)] shadow-sm ring-1 ring-white/[0.06] ${className}`}
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-white/10 px-4 py-2.5">
        <p className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#eec584]">
          {title}
        </p>
        {meta ? (
          <p className="shrink-0 font-mono text-[11px] tabular-nums text-white/40">
            {meta}
          </p>
        ) : null}
      </div>
      <div className={`${BODY_VARIANT[variant]} ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}

/** Values a JsonBlock can render. `gain`/`loss` mark a directional number so it
 *  can take the palette's one green or one red; `elide` stands in for a trimmed
 *  array, rendering as `[ … 4 items ]` while keeping its key so the reader can
 *  still see which field was abbreviated; `inline` keeps a small nested object
 *  on one line.
 *
 *  `inline` exists for height, which is the whole design constraint on a
 *  response panel sitting beside hero copy. A row like `cluster` is three short
 *  scalars and costs five lines fully expanded; on one line it costs one, and
 *  nothing about the shape is lost because it is still literal JSON. Reach for
 *  it on leaf objects, never on the one field a reader is meant to read. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { __gain: number }
  | { __loss: number }
  | { __elide: string }
  | { __inline: Record<string, JsonValue> }
  | JsonValue[]
  | { [k: string]: JsonValue };

export const gain = (n: number) => ({ __gain: n });
export const loss = (n: number) => ({ __loss: n });
export const elide = (label: string) => ({ __elide: label });
export const inline = (o: Record<string, JsonValue>) => ({ __inline: o });

const isGain = (v: JsonValue): v is { __gain: number } =>
  typeof v === "object" && v !== null && "__gain" in v;
const isLoss = (v: JsonValue): v is { __loss: number } =>
  typeof v === "object" && v !== null && "__loss" in v;
const isElide = (v: JsonValue): v is { __elide: string } =>
  typeof v === "object" && v !== null && "__elide" in v;
const isInline = (v: JsonValue): v is { __inline: Record<string, JsonValue> } =>
  typeof v === "object" && v !== null && "__inline" in v;

/** Render a JSON value as coloured spans.
 *
 *  Built by walking the value rather than regex-matching a string: the output
 *  is structurally guaranteed to be valid JSON-shaped, indentation can't drift,
 *  and a key can never be mis-tinted because it happened to look like a string
 *  value. Snippets stay authorable as plain JS objects, which is what keeps the
 *  payloads on this page honest — they're pasted from real API responses. */
function renderValue(value: JsonValue, indent: number): ReactNode {
  const pad = "  ".repeat(indent);
  const padIn = "  ".repeat(indent + 1);

  if (isElide(value))
    return <Tok kind="comment">{`[ \u2026 ${value.__elide} ]`}</Tok>;
  if (isGain(value))
    return (
      <Tok kind="gain">
        {value.__gain > 0 ? `+${value.__gain}` : String(value.__gain)}
      </Tok>
    );
  if (isLoss(value)) return <Tok kind="loss">{String(value.__loss)}</Tok>;
  if (isInline(value)) {
    const entries = Object.entries(value.__inline);

    return (
      <>
        <Tok kind="punct">{"{ "}</Tok>
        {entries.map(([k, v], i) => (
          <span key={k}>
            <Tok kind="key">{`"${k}"`}</Tok>
            <Tok kind="punct">: </Tok>
            {renderValue(v, indent)}
            {i < entries.length - 1 ? <Tok kind="punct">, </Tok> : null}
          </span>
        ))}
        <Tok kind="punct">{" }"}</Tok>
      </>
    );
  }
  if (value === null) return <Tok kind="keyword">null</Tok>;
  if (typeof value === "boolean")
    return <Tok kind="keyword">{String(value)}</Tok>;
  if (typeof value === "number")
    return <Tok kind="number">{String(value)}</Tok>;
  if (typeof value === "string") return <Tok kind="string">{`"${value}"`}</Tok>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <Tok kind="punct">[]</Tok>;

    return (
      <>
        <Tok kind="punct">[</Tok>
        {value.map((v, i) => (
          <span key={i}>
            {"\n"}
            {padIn}
            {renderValue(v, indent + 1)}
            {i < value.length - 1 ? <Tok kind="punct">,</Tok> : null}
          </span>
        ))}
        {"\n"}
        {pad}
        <Tok kind="punct">]</Tok>
      </>
    );
  }

  const entries = Object.entries(value);

  if (entries.length === 0) return <Tok kind="punct">{"{}"}</Tok>;

  return (
    <>
      <Tok kind="punct">{"{"}</Tok>
      {entries.map(([k, v], i) => (
        <span key={k}>
          {"\n"}
          {padIn}
          {/* An elided value keeps its key. Rendering the placeholder alone
              produced orphan lines ("// 4 items") with nothing to say WHICH
              field was trimmed, which reads as a broken payload rather than an
              abbreviated one. */}
          <Tok kind="key">{`"${k}"`}</Tok>
          <Tok kind="punct">: </Tok>
          {renderValue(v, indent + 1)}
          {i < entries.length - 1 ? <Tok kind="punct">,</Tok> : null}
        </span>
      ))}
      {"\n"}
      {pad}
      <Tok kind="punct">{"}"}</Tok>
    </>
  );
}

export function JsonBlock({ value }: { value: JsonValue }) {
  return <pre className="whitespace-pre">{renderValue(value, 0)}</pre>;
}
