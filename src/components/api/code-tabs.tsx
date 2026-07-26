import { useId, useState } from "react";

import { Terminal } from "./terminal";

/** Tabbed request snippets (curl / Python / JavaScript).
 *
 *  The tokeniser is deliberately crude — it colours strings, comments and a
 *  small keyword set, and nothing else. That's the right amount for six-line
 *  snippets: a real grammar would cost bytes for detail nobody reads at this
 *  size, and the brand palette only has four usable syntax hues anyway (see
 *  terminal.tsx). Strings and comments carry ~all the legibility.
 *
 *  Tabs are a segmented control on a translucent track, matching BUTTON_SELECTED
 *  in components/button.ts (near-black/white swap) rather than inventing a
 *  third control style for this page.
 */

export interface Snippet {
  label: string;
  /** Header kicker, e.g. `GET /api/dealings`. */
  title: string;
  meta?: string;
  code: string;
}

const KEYWORDS =
  /\b(import|from|as|def|return|const|let|var|await|async|for|of|in|if|else|print|require|function|new)\b/g;

/** Split a line into coloured spans. Order matters: comments win over strings
 *  (a `#` inside a URL string must not start a comment, so strings are matched
 *  first and comment detection runs on what's left). */
function tokenise(line: string, key: number) {
  const out: React.ReactNode[] = [];
  // One pass: strings, then comments, then keywords in the remaining gaps.
  const stringRe = /(["'`])(?:\\.|(?!\1)[^\\])*\1/g;
  let last = 0;
  let m: RegExpExecArray | null;

  const pushPlain = (text: string, k: string) => {
    if (!text) return;
    // Comment tail (# or //) outside any string.
    const c = text.search(/(^|\s)(#|\/\/)/);

    if (c !== -1) {
      const before = text.slice(0, c);
      const rest = text.slice(c);

      if (before)
        out.push(<span key={`${k}b`}>{withKeywords(before, `${k}bk`)}</span>);
      out.push(
        <span key={`${k}c`} className="text-white/35">
          {rest}
        </span>,
      );

      return;
    }
    out.push(<span key={k}>{withKeywords(text, `${k}k`)}</span>);
  };

  while ((m = stringRe.exec(line)) !== null) {
    pushPlain(line.slice(last, m.index), `p${key}-${m.index}`);
    out.push(
      <span key={`s${key}-${m.index}`} className="text-[#eec584]">
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  pushPlain(line.slice(last), `p${key}-end`);

  return out;
}

function withKeywords(text: string, key: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  KEYWORDS.lastIndex = 0;
  while ((m = KEYWORDS.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={`${key}-${m.index}`} className="text-[#d8b48c]">
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return parts.length ? parts : text;
}

export function CodeTabs({
  snippets,
  className = "",
}: {
  snippets: Snippet[];
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const groupId = useId();
  const current = snippets[active];

  return (
    <div className={className}>
      <div
        aria-label="Language"
        className="mb-3 inline-flex rounded-lg bg-white/[0.06] p-0.5"
        role="tablist"
      >
        {snippets.map((s, i) => (
          <button
            key={s.label}
            aria-controls={`${groupId}-panel`}
            aria-selected={i === active}
            className={`rounded-[7px] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              i === active
                ? "bg-white text-[#1a140d]"
                : "text-white/55 hover:text-white/80"
            }`}
            id={`${groupId}-tab-${i}`}
            role="tab"
            type="button"
            onClick={() => setActive(i)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`${groupId}-tab-${active}`}
        id={`${groupId}-panel`}
        role="tabpanel"
      >
        <Terminal meta={current.meta} title={current.title}>
          <pre className="whitespace-pre">
            {current.code.split("\n").map((line, i) => (
              <div key={i}>{tokenise(line, i)}</div>
            ))}
          </pre>
        </Terminal>
      </div>
    </div>
  );
}
