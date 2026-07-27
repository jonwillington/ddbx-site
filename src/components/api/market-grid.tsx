import type { FlagComponent } from "country-flag-icons/react/3x2";

import { GB, NL, SE, US } from "country-flag-icons/react/3x2";

import { Reveal } from "@/components/download/reveal";
import { CHIP_BASE, CHIP_HAIRLINE, CHIP_SIZE } from "@/components/chip";

/** Coverage, as cards rather than the hairline-ruled list this replaces.
 *
 *  The list version was five rows of "bold name, mono regulator, sentence",
 *  which is the correct shape for the endpoint tables above it and the wrong
 *  one here: the section's claim is breadth, and a stack of identical text rows
 *  reads as length instead. Flags carry breadth at a glance, in a way five more
 *  lines of prose cannot, and the capability tags let a reader check whether
 *  the market they care about actually has the field they need before they
 *  spend a paragraph finding out.
 *
 *  Congress reuses the US flag deliberately (it is the same jurisdiction, a
 *  different register) and is marked Beta, which is the honest state: the feed
 *  exists, no client surfaces it yet.
 */

interface Coverage {
  name: string;
  Flag: FlagComponent;
  source: string;
  note: string;
  /** Fields this feed actually carries today. Order is consistent across
   *  cards so the gaps line up and are readable as gaps. */
  has: string[];
  beta?: boolean;
}

const COVERAGE: Coverage[] = [
  {
    name: "United Kingdom",
    Flag: GB,
    source: "RNS · PDMR notifications",
    note: "Free-text disclosures parsed into fields. The deepest of the five: analysis, performance and portfolio surfaces all run off it.",
    has: ["Triage", "Analysis", "Cluster", "Buy style", "Performance"],
  },
  {
    name: "United States",
    Flag: US,
    source: "SEC EDGAR · Form 4",
    note: "Open-market purchases separated from grants, exercises and tax withholdings, so a P-code buy is the only thing that reaches you.",
    has: ["Triage", "Analysis", "Cluster", "Buy style", "Performance"],
  },
  {
    name: "Sweden",
    Flag: SE,
    source: "Finansinspektionen · Insynsregister",
    note: "MAR Article 19 notifications with the ISIN resolved to a tradeable ticker, and the register's own Swedish wording kept verbatim.",
    has: ["Triage", "Analysis", "Cluster", "Native wording"],
  },
  {
    name: "Netherlands",
    Flag: NL,
    source: "AFM · MAR Article 19 register",
    note: "Euronext Amsterdam listings, with common shares separated from rights and options.",
    has: ["Triage", "Cluster", "Native wording"],
  },
  {
    name: "US Congress",
    Flag: US,
    source: "STOCK Act · House and Senate PTRs",
    note: "Scored on committee jurisdiction, whether the account was the member's own, and how often that member trades.",
    has: ["Rating", "Committee lane", "Performance"],
    beta: true,
  },
];

export function MarketGrid() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {COVERAGE.map((c, i) => (
        <Reveal key={c.name} delay={i * 60}>
          <div className="h-full rounded-3xl border border-white/[0.09] bg-white/[0.035] p-5">
            <div className="flex items-center gap-3">
              {/* Rounded rather than square: a bare 3x2 flag on a dark card
                  reads as a sticker. The ring gives it an edge on the two
                  flags (SE, NL) whose fields go light at the boundary. */}
              <c.Flag className="h-6 w-9 shrink-0 rounded-[3px] ring-1 ring-white/15" />
              <p className="text-[16px] font-semibold leading-snug text-white">
                {c.name}
              </p>
              {c.beta ? (
                <span
                  className={`${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.sm} ml-auto bg-[#eec584]/15 text-[#eec584]`}
                >
                  Beta
                </span>
              ) : null}
            </div>

            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#ad9479]">
              {c.source}
            </p>
            <p className="mt-2.5 text-[13.5px] leading-[1.6] text-white/55">
              {c.note}
            </p>

            <ul className="mt-4 flex flex-wrap gap-1.5">
              {c.has.map((h) => (
                <li
                  key={h}
                  className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/50"
                >
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
