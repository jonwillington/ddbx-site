import type { ReactNode } from "react";

/** The MCP-versus-API table: the thing Jon asked for by name.
 *
 *  Every cell on the API side restates a claim the /developers page already
 *  makes, in its words, and adds none. Two of that page's rules apply here
 *  with full force: the API is ONE thing (a licensed, authenticated, supported
 *  data product, access by request), and nothing on the public web may hint at
 *  a free tier or an open endpoint. The connector column is the free thing;
 *  the table exists to make clear that it is a different thing, not a tier.
 *
 *  Styling follows the site's one data-table idiom (the Fills table on the US
 *  market page, reused by the API reference): hairline row rules, `font-normal`
 *  header cells in muted small caps, no card, no zebra. The first column is
 *  the row's subject and set heaviest; the two value columns are equal so
 *  neither reads as the recommended one. Which is right for you is the row
 *  "Who it is for", not a highlight.
 *
 *  Explicit tracks so the table cannot size itself off its longest cell. Below
 *  `sm` the rows stack instead of scrolling: see the note on the <dl>. */

export interface ComparisonRow {
  label: string;
  mcp: ReactNode;
  api: ReactNode;
}

export const COMPARISON: ComparisonRow[] = [
  {
    label: "Who it is for",
    mcp: "Anyone who uses ChatGPT, Claude or another assistant and wants to ask it about insider buying.",
    api: "Teams building a product, a model or a research pipeline on the data.",
  },
  {
    label: "Getting in",
    mcp: "Paste one address into your assistant. No sign-in, no key.",
    api: "A bearer token, issued when access is agreed.",
  },
  {
    label: "Cost",
    mcp: "Free.",
    api: "Priced to the use case. Quoted on request.",
  },
  {
    label: "What comes back",
    mcp: "Who traded, their role, buy or sell, the trade and disclosure dates, shares, price and value, the ddbx rating label, the sector and whether other insiders bought too. Every filing links to its ddbx page.",
    api: "The full record: everything the connector returns, plus the written analysis (thesis, evidence for and against, key risks, checklist), the triage reason, the buy style and the return since disclosure.",
  },
  {
    label: "Shape",
    mcp: "Plain-language answers, through your assistant. Six tools it calls for you.",
    api: "REST over JSON with cursor pagination and a discovery endpoint.",
  },
  {
    label: "Volume",
    mcp: "Up to 50 filings per question.",
    api: "Page sizes and rate limits set per agreement.",
  },
  {
    label: "Markets",
    mcp: "UK, US, Sweden, Netherlands and the US Congress. Company look-ups and the daily recap for the UK and US.",
    api: "The same five feeds, each in one schema.",
  },
  {
    label: "Support and licence",
    mcp: "As is. The same public data the site shows, read-only.",
    api: "A contract that states redistribution rights field by field, and a person to ask.",
  },
];

const TH =
  "pb-3 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.16em]";

export function ComparisonTable({
  rows = COMPARISON,
}: {
  rows?: ComparisonRow[];
}) {
  return (
    <>
      {/* Under `sm` the three columns cannot fit, and a table that scrolls
          sideways hides the API column, which is half the argument. So the
          same rows stack: label, then the connector cell, then the API cell,
          each cell labelled with the column head it came from. */}
      <dl className="sm:hidden">
        {rows.map((r) => (
          <div
            key={r.label}
            className="border-t border-white/[0.1] py-5 first:border-t-0 first:pt-0"
          >
            <dt className="text-[15px] font-semibold leading-[1.4] tracking-[-0.01em] text-white">
              {r.label}
            </dt>
            <dd className="mt-3">
              <p className={`${TH} pb-1 text-brand-amber`}>MCP connector</p>
              <p className="text-[14px] leading-[1.55] text-white/70">
                {r.mcp}
              </p>
            </dd>
            <dd className="mt-3">
              <p className={`${TH} pb-1 text-brand-tan`}>ddbx API</p>
              <p className="text-[14px] leading-[1.55] text-white/70">
                {r.api}
              </p>
            </dd>
          </div>
        ))}
      </dl>

      <table className="hidden w-full table-fixed border-collapse sm:table">
        <colgroup>
          <col style={{ width: "11rem" }} />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th className={`${TH} text-white/40`} scope="col">
              <span className="sr-only">Row</span>
            </th>
            <th className={`${TH} pr-6 text-brand-amber`} scope="col">
              MCP connector
            </th>
            <th className={`${TH} text-brand-tan`} scope="col">
              ddbx API
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-white/[0.1]">
              <th
                className="py-4 pr-4 text-left align-top text-[14.5px] font-semibold leading-[1.4] tracking-[-0.01em] text-white"
                scope="row"
              >
                {r.label}
              </th>
              <td className="py-4 pr-6 align-top text-[14px] leading-[1.55] text-white/70">
                {r.mcp}
              </td>
              <td className="py-4 align-top text-[14px] leading-[1.55] text-white/70">
                {r.api}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
