/** The objects a living study is made of, besides its chart: the verdict
 *  panel, the table of cells, the dataset note and the citation block.
 *
 *  All four print words and numbers that shared/studies.js already typed out,
 *  so the crawler pre-render and this page cannot state two different
 *  verdicts. Nothing here computes; it lays out.
 */
import type { ReactNode } from "react";
import type {
  Citation,
  Study,
  StudyCell,
  StudyResult,
} from "../../../shared/studies";

import { Link } from "react-router-dom";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/20/solid";
import { useState } from "react";

import {
  longDate,
  measurementLine,
  pct,
  signedPp,
  stateLabel,
  verdictDetail,
  verdictHeadline,
  MIN_CELL,
  MIN_COMPANIES,
} from "../../../shared/studies.js";

import { panel } from "@/components/ui/panel";

/** The state stamp: the same mono eyebrow spec the rest of the family uses,
 *  carrying the one word that tells a reader whether there is a finding. */
export function StateTag({ result }: { result: StudyResult }) {
  const state = result.verdict.state;

  return (
    <span className="inline-flex items-center gap-2 eyebrow text-brand-brown dark:text-brand-tan">
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${
          state === "answered"
            ? "bg-brand-brown dark:bg-brand-tan"
            : state === "open"
              ? "border border-brand-brown dark:border-brand-tan"
              : "border border-dashed border-brand-brown/70 dark:border-brand-tan/70"
        }`}
      />
      {stateLabel(result)}
    </span>
  );
}

/** The finding, or the not-yet state, at the top of the page.
 *
 *  A cream sheet rather than a dark panel, deliberately: the one contrasting
 *  object on a page in this family is the ask at the foot, and a second one
 *  here would make the page read as a funnel. The weight comes from the type.
 *  The headline is set light and large, as the board stages set theirs, so
 *  the sentence is the object. */
export function VerdictPanel({
  result,
  market,
}: {
  result: StudyResult;
  market: "UK" | "US";
}) {
  const waiting = result.verdict.state === "waiting";

  return (
    <section
      aria-labelledby="verdict"
      className={`${panel()} px-5 py-6 sm:px-8 sm:py-8`}
    >
      <StateTag result={result} />
      <h2
        className={`mt-4 max-w-[26ch] text-balance text-heading text-foreground ${
          waiting ? "font-normal" : "font-semibold"
        }`}
        id="verdict"
      >
        {verdictHeadline(result)}
      </h2>
      <p className="mt-5 max-w-[66ch] text-lede text-foreground/75">
        {verdictDetail(result, market)}
      </p>
      <p className="mt-5 font-mono text-caption tabular-nums text-foreground/45">
        {measurementLine(result)}
      </p>
    </section>
  );
}

/** The cells, as a table: every figure the chart draws and the two it does
 *  not, with its n beside it. The table is the accessible view of the chart
 *  and the citable one. Rates under the floor are not divided; the row says
 *  what it has. */
export function CellsTable({ result }: { result: StudyResult }) {
  const head =
    "whitespace-nowrap py-2.5 pr-3 text-left micro text-foreground/45";
  const numHead = `${head} pl-3 pr-0 text-right`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-body">
        <thead>
          <tr className={`border-b border-rule`}>
            <th className={head} scope="col">
              Cell
            </th>
            <th className={numHead} scope="col">
              Purchases
            </th>
            <th className={numHead} scope="col">
              Companies
            </th>
            <th className={numHead} scope="col">
              Beat the index
            </th>
            <th className={numHead} scope="col">
              95% interval
            </th>
            <th className={numHead} scope="col">
              Median abnormal
            </th>
            <th className={numHead} scope="col">
              Mean abnormal
            </th>
          </tr>
        </thead>
        <tbody>
          {result.cells.map((c) => (
            <CellTableRow
              key={c.id}
              cell={c}
              compared={result.compareIds.includes(c.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellTableRow({
  cell,
  compared,
}: {
  cell: StudyCell;
  compared: boolean;
}) {
  const stated = cell.beatRate != null;
  const num =
    "py-3 pl-3 text-right tabular-nums align-top " +
    (stated ? "text-foreground" : "text-foreground/45");
  const tone = (v: number | null) =>
    v == null ? "" : v > 0 ? "text-positive" : v < 0 ? "text-negative" : "";

  return (
    <tr className={`border-b border-rule`}>
      <th
        className={`py-3 pr-4 text-left align-top ${
          cell.nested
            ? "pl-4 text-small font-normal text-foreground/65"
            : "font-medium text-foreground"
        }`}
        scope="row"
      >
        {cell.label}
        {compared ? (
          <span className="ml-2 micro text-brand-brown dark:text-brand-tan">
            tested
          </span>
        ) : null}
      </th>
      <td className={num}>{cell.n}</td>
      <td className={num}>{cell.companies}</td>
      {stated ? (
        <>
          <td className={`${num} font-semibold`}>{pct(cell.beatRate)}</td>
          <td className={num}>
            {pct(cell.interval!.lo)} to {pct(cell.interval!.hi)}
          </td>
          <td className={`${num} ${tone(cell.medianAlpha)}`}>
            {signedPp(cell.medianAlpha)}
          </td>
          <td className={`${num} ${tone(cell.meanAlpha)}`}>
            {signedPp(cell.meanAlpha)}
          </td>
        </>
      ) : (
        <td
          className="py-3 text-right align-top text-small text-foreground/55"
          colSpan={4}
        >
          Not enough yet. Rates appear at {MIN_CELL} purchases across{" "}
          {MIN_COMPANIES} companies
          {cell.clearance?.clearsOn
            ? `; expected ${longDate(cell.clearance.clearsOn)}`
            : ""}
          .
        </td>
      )}
    </tr>
  );
}

/** How to cite the page, as a block a reader can copy in one gesture. The
 *  line itself comes from the shared module so the pre-render prints the
 *  same one. */
export function CitationBlock({ cite }: { cite: Citation }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cite.line);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // The line is selectable text either way.
    }
  };

  return (
    <div className={panel({ size: "roomy" })}>
      <dl className="grid gap-x-8 gap-y-3 text-body sm:grid-cols-[8rem_minmax(0,1fr)]">
        <dt className="micro text-foreground/45">Title</dt>
        <dd className="text-foreground">{cite.title}</dd>
        <dt className="micro text-foreground/45">URL</dt>
        <dd className="break-all text-foreground">{cite.url}</dd>
        <dt className="micro text-foreground/45">Computed</dt>
        <dd className="text-foreground">
          {cite.computedOn}
          {cite.asOf ? `, from outcomes resolved to ${cite.asOf}` : ""}
        </dd>
        <dt className="micro text-foreground/45">Dataset</dt>
        <dd className="font-mono text-small text-foreground">
          {cite.version}
          <span className="ml-2 font-sans text-small text-foreground/55">
            {cite.sample.toLocaleString("en-GB")} purchases
          </span>
        </dd>
        <dt className="micro text-foreground/45">Accessed</dt>
        <dd className="text-foreground">{cite.accessed}</dd>
      </dl>
      <div className={`mt-4 border-t border-rule pt-4`}>
        <p className="select-all font-mono text-small text-foreground/70">
          {cite.line}
        </p>
        <button
          className="mt-3 inline-flex items-center gap-1.5 rounded-control text-small font-medium text-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-brown/40"
          type="button"
          onClick={copy}
        >
          {copied ? (
            <CheckIcon aria-hidden className="h-3.5 w-3.5" />
          ) : (
            <ClipboardDocumentIcon aria-hidden className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy citation"}
        </button>
      </div>
    </div>
  );
}

/** A bulleted run of published rules: the shared methodology, a study’s own
 *  lines, its caveats. Same mark and measure as the boards’ method lists. */
export function RuleList({ lines }: { lines: string[] }) {
  return (
    <ul className="space-y-2.5">
      {lines.map((line) => (
        <li key={line} className="flex gap-2.5 text-body text-foreground/70">
          <span
            aria-hidden
            className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-foreground/30"
          />
          <span className="max-w-measure">{line}</span>
        </li>
      ))}
    </ul>
  );
}

/** The boards where the filings behind a study’s cells are listed by name.
 *  A study never names a person; this is where the reader goes to check. */
export function BehindTheCells({
  study,
  hrefFor = (path) => path,
}: {
  study: Study;
  /** The board's href in the study's market, which may be another domain. */
  hrefFor?: (path: string) => string;
}) {
  return (
    <p className="text-small text-foreground/60">
      The purchases behind these cells are listed, by company and buyer, on{" "}
      {study.boards.map((b, i) => (
        <span key={b.to}>
          {i > 0 ? (i === study.boards.length - 1 ? " and " : ", ") : ""}
          <Link className="underline underline-offset-4" to={hrefFor(b.to)}>
            {b.title}
          </Link>
        </span>
      ))}
      .
    </p>
  );
}

/** Quiet label-over-value pair, for the dataset figures. Smaller than a stat
 *  tile: these are the footnote’s numbers, not the page’s. */
export function Fact({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <dt className="micro text-foreground/45">{k}</dt>
      <dd className="mt-1 text-[20px] font-semibold leading-none tabular-nums tracking-tight text-foreground">
        {v}
      </dd>
    </div>
  );
}
