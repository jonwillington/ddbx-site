import type { JsonValue } from "./terminal";
import type { FlagComponent } from "country-flag-icons/react/3x2";

import { useState } from "react";
import { GB, NL, SE, US } from "country-flag-icons/react/3x2";

import { JsonBlock, Terminal, elide, gain, inline, loss } from "./terminal";

/** The hero's response panel, switchable by feed.
 *
 *  Three problems with the static version this replaces, all the same problem:
 *  one 40-line payload made the hero ~1,100px tall on desktop, said nothing a
 *  reader could act on, and asked them to take "four regulators, one schema" on
 *  trust while showing exactly one regulator.
 *
 *  Flags do the arguing instead. Clicking through five feeds is the fastest
 *  possible proof of the cross-market claim: the keys stay recognisable while
 *  the values change language, currency and regulator. The payloads are
 *  trimmed hard (leaf objects go through `inline`) so every feed lands in
 *  roughly the same 17 lines and switching never jumps the layout.
 *
 *  ⚠ Every row here is a REAL response, pulled from api.ddbx.uk. That is the
 *  page's one non-negotiable: it is asking to be trusted on payload quality, so
 *  a mocked payload would be arguing against itself. Long prose fields are
 *  truncated with a "…", which reads as truncation rather than as the whole
 *  string. Do not invent a row, a field or a figure to fill a gap here. Refresh
 *  from the live API instead.
 */

interface Feed {
  id: string;
  code: string;
  label: string;
  Flag: FlagComponent;
  endpoint: string;
  meta: string;
  /** One line under the panel: what THIS feed proves that the others don't. */
  note: string;
  payload: JsonValue;
}

const FEEDS: Feed[] = [
  {
    id: "uk",
    code: "UK",
    label: "United Kingdom",
    Flag: GB,
    endpoint: "GET /api/dealings",
    meta: "200 OK · 142 ms",
    note: "Free-text RNS parsed into fields, then rated with the evidence on both sides.",
    payload: {
      id: "d-dd78dccd98db8eff",
      disclosed_date: "2026-07-24",
      ticker: "HERC.L",
      director: {
        name: "Brusk Korkmaz",
        role: "Chief Executive Officer",
      },
      value_gbp: 39750,
      sector_normalized: "Industrials",
      cluster: inline({ tier: "strong", count: 3, window_days: 14 }),
      buy_style: inline({ kind: "dip", drawdown_from_high_pct: -0.31 }),
      live_performance: inline({ alpha_pct_disclosed: gain(12.4) }),
      analysis: {
        rating: "significant",
        confidence: 0.88,
        summary: "Third July purchase by the founder-CEO.",
        evidence_for: elide("4 items"),
        evidence_against: elide("2 items"),
        key_risks: elide("3 items"),
      },
    },
  },
  {
    id: "us",
    code: "US",
    label: "United States",
    Flag: US,
    endpoint: "GET /api/us-dealings",
    meta: "200 OK · 118 ms",
    note: "Open-market buys only. Grants, exercises and tax withholdings never enter the feed.",
    payload: {
      id: "f4-0001079428-26-000004-1-0",
      disclosed_date: "2026-07-24",
      ticker: "PNFP",
      reporter: {
        name: "MCCABE ROBERT A JR",
        officer_title: "Chief Banking Officer",
      },
      shares: 10013,
      price: 99.9,
      value: 1000298.7,
      buy_style: inline({ kind: "neutral", trailing_return_pct: 0.0364 }),
      live_performance: inline({ alpha_pct_trade: gain(2.7) }),
      analysis: {
        rating: "noteworthy",
        confidence: 0.62,
        summary: "Founder and Chief Banking Officer Rob McCabe bought…",
        evidence_against: elide("3 items"),
      },
    },
  },
  {
    id: "se",
    code: "SE",
    label: "Sweden",
    Flag: SE,
    endpoint: "GET /api/eu-dealings?market=SE",
    meta: "200 OK · 96 ms",
    note: "Finansinspektionen files in Swedish. The register's own wording is kept verbatim, and the ISIN is resolved to a tradeable ticker.",
    payload: {
      id: "mar-se-2026-07-26-1bxqxmz",
      market: "SE",
      disclosed_date: "2026-07-26T14:39:26Z",
      ticker: "KFASTB",
      isin: "SE0016101679",
      reporter: {
        name: "Leif Håkan Astikainen",
        role: "Annan medlem i bolagets lednings-…",
      },
      instrument_type: "Aktie",
      nature: "Förvärv",
      volume: 20501,
      price: 11.5348563,
      currency: "SEK",
      venue: "NASDAQ STOCKHOLM AB",
    },
  },
  {
    id: "nl",
    code: "NL",
    label: "Netherlands",
    Flag: NL,
    endpoint: "GET /api/eu-dealings?market=NL",
    meta: "200 OK · 101 ms",
    note: "A dismissal, with the reason attached. Rows that fail the screen keep their verdict so you can audit it.",
    payload: {
      id: "mar-nl-202607200EDD918C…-1",
      market: "NL",
      disclosed_date: "2026-07-20T00:00:00Z",
      ticker: "OCI",
      isin: "NL0010558797",
      reporter: {
        name: "NNS HOLDING (CYPRUS) LIMITED",
        role: "Non-Executive Director",
        filing_entity: "Sawiris N.",
      },
      nature: "Verwerving",
      volume: 100000,
      price: 4.08,
      currency: "EUR",
      triage: {
        verdict: "skip",
        reason: "Cyprus-domiciled holding company, off-exchange…",
      },
    },
  },
  {
    id: "usg",
    code: "Congress",
    label: "US Congress",
    Flag: US,
    endpoint: "GET /api/gov-dealings",
    meta: "200 OK · 88 ms",
    note: "Scored on committee jurisdiction and whose account it was. Losers stay in the feed.",
    payload: {
      id: "cap-1620cb1c23f87d1e",
      disclosed_date: "2026-07-08",
      ticker: "LHX",
      reporter: {
        name: "Richard McCormick",
        chamber: "house",
        party: "R",
        state: "GA",
      },
      transaction_type: "purchase",
      owner: "self",
      amount_min: 1001,
      amount_max: 15000,
      is_late: false,
      rating: "noteworthy",
      rating_explain: elide("4 factors"),
      live_performance: inline({ alpha_pct_disclosed: loss(-0.64) }),
    },
  },
];

export function ResponseExplorer() {
  const [active, setActive] = useState(0);
  const feed = FEEDS[active];

  return (
    <div className="relative isolate min-w-0">
      {/* Ambient wash behind the panel. The hero card is one flat brown, and a
          terminal dropped onto it reads as pasted-on rather than lit. Two soft
          brand-amber radials give the object somewhere to sit. Purely
          decorative, so it stays out of the accessibility tree.

          `isolate` on the parent is load-bearing: it gives this a stacking
          context to sit behind. Without it `-z-10` resolves against the hero
          card and the gradient paints UNDER that card's opaque background,
          which is to say nowhere. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-4 -inset-y-10 -z-10 opacity-70 blur-2xl [background:radial-gradient(60%_45%_at_78%_8%,rgba(238,197,132,0.16),transparent_70%),radial-gradient(55%_40%_at_10%_95%,rgba(173,148,121,0.14),transparent_72%)] sm:-inset-x-10"
      />

      {/* Buttons with aria-pressed rather than a real tablist. A tablist owes
          the user roving tabindex and arrow-key navigation; these are five
          toggles that swap one panel, and claiming the pattern without
          implementing it is worse for a screen reader than not claiming it. */}
      <div aria-label="Choose a feed" className="mb-3 flex flex-wrap gap-1.5">
        {FEEDS.map((f, i) => {
          const on = i === active;

          return (
            <button
              key={f.id}
              aria-controls="api-response-panel"
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#eec584]/40 ${
                on
                  ? "border-[#eec584]/45 bg-[#eec584]/15 text-[#eec584]"
                  : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/70"
              }`}
              title={f.label}
              type="button"
              onClick={() => setActive(i)}
            >
              <f.Flag className="h-3 w-4 shrink-0 rounded-[2px]" />
              {f.code}
            </button>
          );
        })}
      </div>

      {/* Every payload is rendered, all five stacked into one grid cell, with
          the four inactive ones `invisible` rather than unmounted.
          `visibility: hidden` still takes part in layout, so the cell is
          always as tall as the TALLEST feed and the hero cannot resize when
          you click between them. A `min-h` was the first attempt and is the
          wrong tool: it is a floor, so the UK payload (22 lines) still
          overshot it and Congress (16) still fell back to it. This has no
          magic number to keep in sync, so a longer payload added later
          cannot reintroduce the jump. */}
      <Terminal meta={feed.meta} title={feed.endpoint}>
        <div className="grid" id="api-response-panel">
          {FEEDS.map((f, i) => (
            <div
              key={f.id}
              aria-hidden={i !== active}
              // Re-adding the class on switch is what replays the fade; the
              // node itself is never remounted.
              className={`col-start-1 row-start-1 ${
                i === active ? "animate-content-in" : "invisible"
              }`}
            >
              <JsonBlock value={f.payload} />
            </div>
          ))}
        </div>
      </Terminal>

      {/* Same trick for the caption: the notes run to one or two lines
          depending on the feed and the width. */}
      <div className="mt-3 grid text-[12.5px] leading-[1.5] text-white/40">
        {FEEDS.map((f, i) => (
          <p
            key={f.id}
            aria-hidden={i !== active}
            className={`col-start-1 row-start-1 ${
              i === active ? "animate-content-in" : "invisible"
            }`}
          >
            {f.note}
          </p>
        ))}
      </div>
    </div>
  );
}
