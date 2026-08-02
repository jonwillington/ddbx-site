/** Shared furniture for the Congress family — the identity header, the
 *  how-to-read panel, the lane panel and the filings board.
 *
 *  Split out of the pages for the usual reason (the member page and the
 *  committee page render the same objects) and for one specific to this family:
 *  the honesty layer is a set of components, not a set of strings. Every
 *  qualification these pages owe a reader — bands not amounts, bulk filings not
 *  decisions, unmodelled jurisdiction not zero jurisdiction — has a component
 *  here whose job is to render it in a way that gets read. Putting them in one
 *  file makes it obvious when one goes missing.
 *
 *  The design rule the family follows: the caveats are NOT small print. On a
 *  page about a named legislator, the qualification is the content. So
 *  `HowToRead` is a full-width panel directly under the identity block, at body
 *  size, above the numbers it qualifies — not a grey line under the table where
 *  it would be skipped by everyone who most needs it.
 */
import type { ReactNode } from "react";
import type { GovDealing, GovMemberSummary } from "@/types/ddbx";

import { Link } from "react-router-dom";

import {
  band,
  bulkTag,
  committeePath,
  committeeSlug,
  memberNoun,
  memberPathFor,
  seat,
  shortCommittee,
  usd,
} from "../../../shared/congress.js";

import { PartyChip } from "@/components/party-chip";
import { ChamberChip } from "@/components/chamber-chip";
import { TickerPill } from "@/components/ticker-pill";
import { CompanyLogo } from "@/components/company-logo";
import { companyPath } from "@/lib/company";

/** The family's type tokens, same names the sector pages use so a reader
 *  moving between families sees one voice. */
export const R = {
  body: "text-[14px] leading-[1.65] text-foreground/70",
  label: "text-[12px] text-foreground/45",
  eyebrow:
    "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan",
};

const RULE = "border-hairline dark:border-separator";

/* ─── Identity ───────────────────────────────────────────────────────────── */

/** The member's name and portrait, for the shell's `title` slot.
 *
 *  It goes INSIDE the shell's h1 rather than rendering an h1 of its own. The
 *  first version did the latter and shipped two: the shell's (carrying an
 *  sr-only copy of the name, because `title` is required) and this one. Valid
 *  HTML5, and still a screen reader announcing the same name twice before any
 *  content. Every element here is inline so it nests in an h1 legally.
 *
 *  The portrait is a public-domain congressional photograph served from our own
 *  R2 mirror, so it cannot hotlink-break and carries no third-party request. It
 *  degrades to initials rather than a broken-image glyph: a member without a
 *  Bioguide portrait is common enough that a broken frame would otherwise be the
 *  page's first impression for a meaningful slice of the roster. */
export function MemberTitle({ member }: { member: GovMemberSummary }) {
  return (
    <span className="flex items-center gap-4 sm:gap-5">
      <MemberPortrait member={member} size={76} />
      <span className="min-w-0">{member.name}</span>
    </span>
  );
}

/** Party, chamber and seat, directly under the h1. Separate from the title so
 *  the chips are not inside a heading, where their text would be announced as
 *  part of it. */
export function MemberSeatLine({ member }: { member: GovMemberSummary }) {
  const seatLine = [
    memberNoun(member.chamber),
    member.state
      ? member.district != null
        ? `for ${member.state}-${member.district}`
        : `for ${member.state}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <PartyChip party={member.party} />
      <ChamberChip chamber={member.chamber} />
      <span className="text-[12.5px] text-foreground/55">{seatLine}</span>
    </div>
  );
}

export function MemberPortrait({
  member,
  size = 56,
}: {
  member: { name: string; photo_url?: string };
  size?: number;
}) {
  const initials = member.name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border ${RULE} bg-black/[0.035] dark:bg-white/[0.05]`}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden
        className="absolute text-[15px] font-semibold text-foreground/35"
      >
        {initials}
      </span>
      {member.photo_url ? (
        <img
          alt=""
          className="relative h-full w-full object-cover object-top"
          height={size}
          loading="lazy"
          src={member.photo_url}
          width={size}
          // The initials sit underneath rather than in an onError swap: a
          // failed load then reveals them with no state, no flash and no
          // second render.
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}

/* ─── The honesty layer ──────────────────────────────────────────────────── */

/** The qualifications a reader needs BEFORE the numbers, as a panel rather than
 *  a footnote.
 *
 *  Takes already-built sentences (they come from shared/congress.js so the
 *  pre-render says the same thing) and renders the ones that apply. Renders
 *  nothing when nothing applies, which is the common case for a member with a
 *  handful of ordinary filings — the panel appearing is itself a signal that
 *  something about this member's record needs explaining.
 *
 *  `lead` is the one that changes the meaning of the whole page (an
 *  advisor-managed book), so it sits first and unruled. */
export function HowToRead({
  lead,
  notes,
}: {
  lead?: string | null;
  notes: (string | null | undefined)[];
}) {
  const items = notes.filter((n): n is string => !!n);

  if (!lead && items.length === 0) return null;

  return (
    <aside
      className={`mt-7 rounded-2xl border ${RULE} bg-black/[0.02] p-5 dark:bg-white/[0.03]`}
    >
      <p className={R.eyebrow}>How to read this</p>
      {lead ? (
        <p className="mt-3 max-w-[68ch] text-[14px] font-medium leading-[1.6] text-foreground/85">
          {lead}
        </p>
      ) : null}
      {items.length > 0 ? (
        <ul className={lead ? "mt-3" : "mt-3"}>
          {items.map((n, i) => (
            <li
              key={n}
              className={`max-w-[68ch] py-2 ${R.body} ${
                i > 0 || lead ? `border-t ${RULE}` : ""
              }`}
            >
              {n}
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

/* ─── The lane ───────────────────────────────────────────────────────────── */

/** Committees, and which of them we map a sector jurisdiction for.
 *
 *  The page's reason to exist, so it is a panel rather than a list of chips.
 *  Committees we model link to their own page and carry their sectors;
 *  committees we do not are still listed — omitting them would misrepresent the
 *  member's assignments — but are visibly not part of the lane calculation.
 *  That distinction is the whole point: a reader must be able to see that "no
 *  lane" can mean "we don't map this committee". */
export function LanePanel({
  committees,
  lanes,
  laneLine,
}: {
  committees: string[];
  /** committee name -> sectors, from /api/gov-committees. */
  lanes: Map<string, string[]>;
  /** The in-lane sentence, or the unmodelled note. Already chosen by the
   *  caller via laneSentence() / unmodelledLaneNote(). */
  laneLine: string;
}) {
  // One sentence, not two. The caller passes `laneLine` already built, and for
  // a member with no assignments it says "none of this member's committees are
  // ones we map" — which, appended to "we have no assignments on file", states
  // the same absence twice in different words.
  if (committees.length === 0) {
    return (
      <p className={`mt-4 max-w-[62ch] ${R.body}`}>
        Our roster records no current full-committee assignments for this
        member, so no lane is computed. The filings below are complete either
        way.
      </p>
    );
  }

  const modelled = committees.filter((c) => lanes.has(c));
  const unmodelled = committees.filter((c) => !lanes.has(c));

  return (
    <div className="mt-4">
      <p className={`max-w-[62ch] ${R.body}`}>{laneLine}</p>

      {modelled.length > 0 ? (
        <ul className={`mt-4 border-t ${RULE}`}>
          {modelled.map((c) => (
            <li
              key={c}
              className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b ${RULE} py-2.5`}
            >
              <Link
                className="text-[14px] font-medium text-foreground underline-offset-4 hover:underline"
                to={committeePath(committeeSlug(c))}
              >
                {shortCommittee(c)}
              </Link>
              <span className={R.label}>
                oversees {(lanes.get(c) ?? []).join(", ").toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {unmodelled.length > 0 ? (
        <div className="mt-4">
          <p className={R.label}>
            Also sits on {unmodelled.map(shortCommittee).join(", ")}. We do not
            map a sector jurisdiction for{" "}
            {unmodelled.length === 1 ? "it" : "these"}, so{" "}
            {unmodelled.length === 1 ? "it does" : "they do"} not contribute to
            the figure above.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Filings ────────────────────────────────────────────────────────────── */

const OWNER_LABEL: Record<string, string> = {
  self: "Own account",
  spouse: "Spouse",
  joint: "Joint",
  child: "Dependent",
};

/** The filings board.
 *
 *  Every money cell is a BAND. There is no column that could be mistaken for an
 *  amount, because the filings do not contain one.
 *
 *  `showMember` switches the leading column from the issuer to the member, so
 *  the committee page can reuse the board without a second implementation. */
export function FilingsBoard({
  rows,
  showMember = false,
  memberBySlug,
}: {
  rows: GovDealing[];
  showMember?: boolean;
  /** bioguide -> summary, for the member column's link. */
  memberBySlug?: Map<string, GovMemberSummary>;
}) {
  if (rows.length === 0) {
    return <p className={`mt-4 ${R.body}`}>No filings to show.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse text-left">
        <thead>
          <tr className={`border-b ${RULE}`}>
            <Th>{showMember ? "Member" : "Company"}</Th>
            <Th>{showMember ? "Company" : "Filed"}</Th>
            <Th>Disclosed band</Th>
            <Th>Account</Th>
            <Th className="text-right">Since disclosure</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const m = memberBySlug?.get(d.reporter.id);
            const perf = d.live_performance?.return_pct_disclosed ?? null;

            return (
              <tr key={d.id} className={`border-b ${RULE} align-top`}>
                <Td>
                  {showMember ? (
                    m ? (
                      <Link
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                        to={memberPathFor(m)}
                      >
                        {d.reporter.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{d.reporter.name}</span>
                    )
                  ) : (
                    <IssuerCell dealing={d} />
                  )}
                </Td>
                <Td>
                  {showMember ? (
                    <IssuerCell dealing={d} />
                  ) : (
                    <span className="tabular-nums">{d.disclosed_date}</span>
                  )}
                </Td>
                <Td className="tabular-nums">
                  {band(d.amount_min ?? 0, d.amount_max ?? 0)}
                </Td>
                <Td>
                  <span
                    className={d.owner === "self" ? "" : "text-foreground/60"}
                  >
                    {OWNER_LABEL[d.owner] ?? d.owner}
                  </span>
                </Td>
                <Td className="text-right tabular-nums">
                  {perf == null ? (
                    <span className="text-foreground/30">—</span>
                  ) : (
                    <span
                      className={perf >= 0 ? "text-positive" : "text-negative"}
                    >
                      {perf >= 0 ? "+" : ""}
                      {perf.toFixed(1)}%
                    </span>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IssuerCell({ dealing }: { dealing: GovDealing }) {
  if (!dealing.ticker) {
    return (
      <span className="text-foreground/60">
        {dealing.company || "Unparsed holding"}
      </span>
    );
  }

  return (
    <Link
      className="inline-flex items-center gap-2 underline-offset-4 hover:underline"
      to={companyPath(dealing.ticker)}
    >
      <CompanyLogo className="h-5 w-5" size={20} ticker={dealing.ticker} />
      <TickerPill ticker={dealing.ticker} />
    </Link>
  );
}

function Th({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`pb-2 pr-4 text-[11px] font-medium leading-tight text-foreground/45 last:pr-0 ${className}`}
      scope="col"
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`py-2.5 pr-4 text-[13.5px] last:pr-0 ${className}`}>
      {children}
    </td>
  );
}

/* ─── Issuers ────────────────────────────────────────────────────────────── */

/** Most-filed issuers, with the in-lane ones marked.
 *
 *  The mark is the differentiated content on the page, so it is a label and not
 *  a coloured dot: "in lane" needs to be readable as words for it to mean
 *  anything, and a legend is one more thing to look up. */
export function IssuerList({
  issuers,
  laneModelled,
}: {
  issuers: {
    ticker: string;
    company: string;
    count: number;
    in_lane: boolean;
  }[];
  laneModelled: boolean;
}) {
  const top = issuers[0]?.count ?? 1;

  return (
    <ul className={`mt-4 border-t ${RULE}`}>
      {issuers.map((it) => (
        <li
          key={it.ticker}
          className={`flex items-center gap-4 border-b ${RULE} py-2.5`}
        >
          <CompanyLogo className="shrink-0" size={24} ticker={it.ticker} />
          <Link
            className="min-w-0 flex-1 truncate text-[13.5px] underline-offset-4 hover:underline"
            to={companyPath(it.ticker)}
          >
            {it.company || it.ticker}
          </Link>
          {laneModelled && it.in_lane ? (
            <span className={`${R.label} shrink-0`}>in lane</span>
          ) : null}
          <span className="w-24 shrink-0">
            <span
              aria-hidden
              className="block h-[3px] rounded-full bg-foreground/15"
              style={{ width: `${Math.max(8, (it.count / top) * 100)}%` }}
            />
          </span>
          <span className="w-8 shrink-0 text-right text-[13px] tabular-nums text-foreground/60">
            {it.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ─── Directory rows ─────────────────────────────────────────────────────── */

/** One member in the directory. Shows the band, not a total. */
export function MemberRow({ member }: { member: GovMemberSummary }) {
  const s = member.stats;
  const tag = bulkTag(member);

  return (
    <li className={`border-b ${RULE}`}>
      <Link
        className="flex items-center gap-4 py-3.5 transition-colors hover:bg-foreground/[0.02]"
        to={memberPathFor(member)}
      >
        <MemberPortrait member={member} size={44} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[14.5px] font-medium text-foreground">
              {member.name}
            </span>
            <PartyChip party={member.party} />
            <span className={R.label}>{seat(member)}</span>
          </span>
          <span className={`mt-0.5 block ${R.label}`}>
            {s.filing_docs} {s.filing_docs === 1 ? "filing" : "filings"} ·{" "}
            {s.issuers} {s.issuers === 1 ? "company" : "companies"} · last{" "}
            {s.last_disclosed}
            {/* Without this a row reading "5 filings, 429 companies" presents
                one account-level disclosure as a prolific stock-picker, and the
                directory is where most readers meet a member first. The full
                explanation is on their page; this is the flag that sends them
                there. */}
            {tag ? (
              <span className="ml-1.5 text-foreground/35">({tag})</span>
            ) : null}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[13px] tabular-nums text-foreground/70">
            {band(s.total_min, s.total_max)}
          </span>
          <span className={`block ${R.label}`}>disclosed band</span>
        </span>
      </Link>
    </li>
  );
}

export { usd };
