import { Link } from "react-router-dom";

import { resolveStoryLink } from "@/lib/stories";

/** Renderer for a story's markdown body.
 *
 *  Deliberately a small hand-rolled renderer rather than a markdown library
 *  with `dangerouslySetInnerHTML`. The body is model-generated, so the set of
 *  elements it can produce on the page should be a closed list decided here:
 *  headings, paragraphs, tables, blockquotes, lists, bold and links. Anything
 *  the generator emits outside that renders as plain text rather than as
 *  markup, which is the failure mode we want.
 *
 *  Links are the reason this exists at all. `ddbx://` targets route in-app via
 *  react-router so a reader stays on the site; external citations open in a new
 *  tab with rel="noopener noreferrer". Nothing else is clickable.
 */

const A_EXTERNAL =
  "underline decoration-hairline underline-offset-2 hover:decoration-foreground";

function Inline({ text }: { text: string }) {
  // One pass over links and bold. Order matters: links first, because a link
  // label can contain bold but not the other way round in our output.
  const nodes: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] != null && m[2] != null) {
      const { href, internal } = resolveStoryLink(m[2]);
      nodes.push(
        internal ? (
          <Link key={key++} className={A_EXTERNAL} to={href}>
            {m[1]}
          </Link>
        ) : (
          <a
            key={key++}
            className={A_EXTERNAL}
            href={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {m[1]}
          </a>
        ),
      );
    } else if (m[3] != null) {
      nodes.push(
        <strong key={key++} className="font-medium text-foreground">
          {m[3]}
        </strong>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function Table({ rows }: { rows: string[] }) {
  const cells = (line: string) =>
    line
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());
  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells);

  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-hairline dark:border-separator">
            {head.map((h, i) => (
              <th
                key={i}
                className="py-2 pr-4 text-left font-medium text-foreground/60"
              >
                <Inline text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr
              key={i}
              className="border-b border-hairline/60 dark:border-separator/60"
            >
              {r.map((c, j) => (
                <td key={j} className="py-2 pr-4 align-top text-foreground/80">
                  <Inline text={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StoryBody({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Tables: a header row, a separator row, then body rows.
    if (line.trim().startsWith("|") && lines[i + 1]?.includes("---")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i]);
        i += 1;
      }
      out.push(<Table key={key++} rows={rows} />);
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      out.push(
        level === 2 ? (
          <h2
            key={key++}
            className="mt-10 text-[19px] font-medium leading-snug text-foreground"
          >
            <Inline text={text} />
          </h2>
        ) : (
          <h3
            key={key++}
            className="mt-8 text-[16px] font-medium text-foreground"
          >
            <Inline text={text} />
          </h3>
        ),
      );
      i += 1;
      continue;
    }

    if (line.trim().startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(
        <blockquote
          key={key++}
          className="my-6 border-l-2 border-hairline pl-4 text-[15px] italic leading-relaxed text-foreground/70 dark:border-separator"
        >
          <Inline text={quote.join(" ")} />
        </blockquote>,
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i += 1;
      }
      out.push(
        <ul
          key={key++}
          className="my-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/80"
        >
          {items.map((it, n) => (
            <li key={n}>
              <Inline text={it} />
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // A horizontal rule ends the article body; the sources block follows it.
    if (/^---+$/.test(line.trim())) {
      out.push(
        <hr
          key={key++}
          className="my-8 border-hairline dark:border-separator"
        />,
      );
      i += 1;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].trim().startsWith(">") &&
      !/^#{2,4}\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push(
      <p
        key={key++}
        className="my-4 text-[15px] leading-[1.7] text-foreground/80"
      >
        <Inline text={para.join(" ")} />
      </p>,
    );
  }

  return <div>{out}</div>;
}
