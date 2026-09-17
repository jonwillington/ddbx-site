import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mergeTape,
  normaliseFeed,
  tapeCoverageNow,
  tapeMarketStates,
  tapeRowHref,
  tapeSummary,
  TAPE_MARKETS,
} from "../shared/tape.js";
import {
  applyTapeFeeds,
  failTapePoll,
  initialTapeState,
  showPendingTape,
} from "../shared/tape-state.js";

const close = (actual, expected, msg) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${msg}: ${actual} != ${expected}`);

// ---------------------------------------------------------------------------
// EU transaction identity. Real rows from /api/eu-dealings?view=all, read on
// 2026-09-17, trimmed to the fields the normaliser reads. Public MAR filings.
// ---------------------------------------------------------------------------

// SE: FI publishes no notification id. Corem's CEO (through a closely
// associated entity) filed twice on 8 September: one notification at 17:45
// for a buy on the 4th, and one at 23:44 reporting buys on the 7th and 8th.
// Before the fix these summed into one row of 499,697 shares.
const ARNHULT = [
  { id: "mar-se-2026-09-08-1n0w4x7", market: "SE", trade_date: "2026-09-07", disclosed_date: "2026-09-08T23:44:20Z", reporter: { name: "Rutger Arnhult", role: "Verkställande direktör (VD)", is_closely_associated: true }, company: "Corem Property Group AB", lei: "213800CHXQQD7TSS1T59", isin: "SE0010714287", nature: "Förvärv", volume: 64697, price: 2.51, currency: "SEK", venue: "NASDAQ STOCKHOLM AB", is_amendment: false, is_share_programme: false, is_first_time_report: true, status: "Aktuell", ticker: "COREB" },
  { id: "mar-se-2026-09-08-16syxsk", market: "SE", trade_date: "2026-09-08", disclosed_date: "2026-09-08T23:44:20Z", reporter: { name: "Rutger Arnhult", role: "Verkställande direktör (VD)", is_closely_associated: true }, company: "Corem Property Group AB", lei: "213800CHXQQD7TSS1T59", isin: "SE0010714287", nature: "Förvärv", volume: 125000, price: 2.4772, currency: "SEK", venue: "NASDAQ STOCKHOLM AB", is_amendment: false, is_share_programme: false, is_first_time_report: true, status: "Aktuell", ticker: "COREB" },
  { id: "mar-se-2026-09-08-1c6w34", market: "SE", trade_date: "2026-09-04", disclosed_date: "2026-09-08T17:45:32Z", reporter: { name: "Rutger Arnhult", role: "Verkställande direktör (VD)", is_closely_associated: true }, company: "Corem Property Group AB", lei: "213800CHXQQD7TSS1T59", isin: "SE0010714287", nature: "Förvärv", volume: 310000, price: 2.492, currency: "SEK", venue: "NASDAQ STOCKHOLM AB", is_amendment: false, is_share_programme: false, is_first_time_report: true, status: "Aktuell", ticker: "COREB" },
];

const HELMERSSON = [
  { id: "mar-se-2026-09-16-fwbjlo", market: "SE", trade_date: "2026-09-11", disclosed_date: "2026-09-16T15:31:14Z", reporter: { name: "Andreas Helmersson", role: "Ekonomichef/finanschef/finansdirektör", is_closely_associated: false }, company: "ITAB Shop Concept AB", lei: "2138001H6FCSZBP26351", isin: "SE0015962097", nature: "Förvärv", volume: 9900, price: 17.567, currency: "SEK", venue: "NASDAQ STOCKHOLM AB", is_amendment: false, is_share_programme: false, is_first_time_report: true, status: "Aktuell", ticker: "ITAB-B" },
  { id: "mar-se-2026-09-16-1ixfxm9", market: "SE", trade_date: "2026-09-16", disclosed_date: "2026-09-16T15:31:14Z", reporter: { name: "Andreas Helmersson", role: "Ekonomichef/finanschef/finansdirektör", is_closely_associated: false }, company: "ITAB Shop Concept AB", lei: "2138001H6FCSZBP26351", isin: "SE0015962097", nature: "Förvärv", volume: 1600, price: 17.09, currency: "SEK", venue: "NASDAQ STOCKHOLM AB", is_amendment: false, is_share_programme: false, is_first_time_report: true, status: "Aktuell", ticker: "ITAB-B" },
  { id: "mar-se-2026-09-16-1baifmg", market: "SE", trade_date: "2026-09-14", disclosed_date: "2026-09-16T15:31:14Z", reporter: { name: "Andreas Helmersson", role: "Ekonomichef/finanschef/finansdirektör", is_closely_associated: false }, company: "ITAB Shop Concept AB", lei: "2138001H6FCSZBP26351", isin: "SE0015962097", nature: "Förvärv", volume: 8500, price: 17.372, currency: "SEK", venue: "NASDAQ STOCKHOLM AB", is_amendment: false, is_share_programme: false, is_first_time_report: true, status: "Aktuell", ticker: "ITAB-B" },
];

const LARSSON = [
  { id: "mar-se-2026-09-16-q90mcn", market: "SE", trade_date: "2026-09-11", disclosed_date: "2026-09-16T15:46:49Z", reporter: { name: "Claes Larsson", role: "Annan medlem i bolagets administrations-, lednings- eller kontrollorgan", is_closely_associated: false }, company: "Skanska AB", lei: "549300UINV5RINHGMG07", isin: "SE0000113250", nature: "Förvärv", volume: 250, price: 266.212335, currency: "SEK", venue: "NASDAQ STOCKHOLM AB", is_amendment: true, is_share_programme: false, is_first_time_report: false, status: "Aktuell", ticker: "SKA-B" },
  { id: "mar-se-2026-09-16-7kgyxd", market: "SE", trade_date: "2026-09-12", disclosed_date: "2026-09-16T15:42:08Z", reporter: { name: "Claes Larsson", role: "Annan medlem i bolagets administrations-, lednings- eller kontrollorgan", is_closely_associated: false }, company: "Skanska AB", lei: "549300UINV5RINHGMG07", isin: "SE0000113250", nature: "Tilldelning", volume: 252, price: 266.2, currency: "SEK", venue: "Utanför handelsplats", is_amendment: true, is_share_programme: false, is_first_time_report: false, status: "Aktuell", ticker: "SKA-B" },
  { id: "mar-se-2026-09-16-scldnx", market: "SE", trade_date: "2026-09-12", disclosed_date: "2026-09-16T15:34:58Z", reporter: { name: "Claes Larsson", role: "Annan medlem i bolagets administrations-, lednings- eller kontrollorgan", is_closely_associated: false }, company: "Skanska AB", lei: "549300UINV5RINHGMG07", isin: "SE0000113250", nature: "Tilldelning", volume: 252, price: 266.212335, currency: "SEK", venue: "Utanför handelsplats", is_amendment: true, is_share_programme: false, is_first_time_report: false, status: "Reviderad", ticker: "SKA-B" },
  { id: "mar-se-2026-09-16-12u3s0e", market: "SE", trade_date: "2026-09-12", disclosed_date: "2026-09-16T11:27:53Z", reporter: { name: "Claes Larsson", role: "Annan medlem i bolagets administrations-, lednings- eller kontrollorgan", is_closely_associated: false }, company: "Skanska AB", lei: "549300UINV5RINHGMG07", isin: "SE0000113250", nature: "Tilldelning", volume: 252, price: 266.2, currency: "SEK", venue: "Utanför handelsplats", is_amendment: false, is_share_programme: false, is_first_time_report: true, status: "Reviderad", ticker: "SKA-B" },
  { id: "mar-se-2026-09-16-1wftzpe", market: "SE", trade_date: "2026-09-11", disclosed_date: "2026-09-16T11:03:48Z", reporter: { name: "Claes Larsson", role: "Annan medlem i bolagets administrations-, lednings- eller kontrollorgan", is_closely_associated: false }, company: "Skanska AB", lei: "549300UINV5RINHGMG07", isin: "SE0000113250", nature: "Förvärv", volume: 250, price: 266.21, currency: "SEK", venue: "NASDAQ STOCKHOLM AB", is_amendment: false, is_share_programme: false, is_first_time_report: true, status: "Reviderad", ticker: "SKA-B" },
];

const GRIFFITH = [
  { id: "mar-nl-20260901EE973CD5_012B_4330_B7BE_F8E7419AC857-1", market: "NL", trade_date: "2026-09-01", disclosed_date: "2026-09-01T00:00:00Z", reporter: { name: "Griffith R.E.", role: "Director and principal of the Investment Manager", is_closely_associated: false }, company: "Tetragon Financial Group Limited", lei: "14URO7KANNWKTLQY7F55", isin: "GG00B1RMC548", nature: "Verwerving", volume: 6141, price: 14.1, currency: "USD", venue: "EURONEXT - EURONEXT AMSTERDAM", is_amendment: false, is_share_programme: false, is_first_time_report: false, status: "Actief", ticker: "TFG" },
  { id: "mar-nl-20260901EE973CD5_012B_4330_B7BE_F8E7419AC857-0", market: "NL", trade_date: "2026-09-01", disclosed_date: "2026-09-01T00:00:00Z", reporter: { name: "Griffith R.E.", role: "Director and principal of the Investment Manager", is_closely_associated: false }, company: "Tetragon Financial Group Limited", lei: "14URO7KANNWKTLQY7F55", isin: "GG00B1RMC548", nature: "Verwerving", volume: 5767, price: 14.05, currency: "USD", venue: "EURONEXT - EURONEXT AMSTERDAM", is_amendment: false, is_share_programme: false, is_first_time_report: false, status: "Actief", ticker: "TFG" },
];

const BORGIONS = [
  { id: "mar-nl-202609077A75A1A6_048D_486F_B9AB_708A0461C7B3-1", market: "NL", trade_date: "2026-09-07", disclosed_date: "2026-09-07T00:00:00Z", reporter: { name: "Borgions F.", role: "Chief Technology Innovation Officer", is_closely_associated: false }, company: "argenx SE", lei: "7245009C5FZE6G9ODQ71", isin: "NL0010832176", nature: "Verwerving", volume: 1500, price: 309.2, currency: "EUR", venue: "OTC", is_amendment: false, is_share_programme: true, is_first_time_report: false, status: "Actief", ticker: "1AE" },
  { id: "mar-nl-202609077A75A1A6_048D_486F_B9AB_708A0461C7B3-0", market: "NL", trade_date: "2026-09-07", disclosed_date: "2026-09-07T00:00:00Z", reporter: { name: "Borgions F.", role: "Chief Technology Innovation Officer", is_closely_associated: false }, company: "argenx SE", lei: "7245009C5FZE6G9ODQ71", isin: "NL0010832176", nature: "Vervreemding", volume: 1500, price: 862.12, currency: "EUR", venue: "EURONEXT - EURONEXT AMSTERDAM", is_amendment: false, is_share_programme: true, is_first_time_report: false, status: "Actief", ticker: "1AE" },
  { id: "mar-nl-20260907767AA618_FCF2_43E4_B2FD_69726CF35BFA-1", market: "NL", trade_date: "2026-09-07", disclosed_date: "2026-09-07T00:00:00Z", reporter: { name: "Borgions F.", role: "Chief Technology Innovation Officer", is_closely_associated: false }, company: "argenx SE", lei: "7245009C5FZE6G9ODQ71", isin: "NL0010832176", nature: "Verwerving", volume: 47, price: 309.2, currency: "EUR", venue: "OTC", is_amendment: false, is_share_programme: true, is_first_time_report: false, status: "Actief", ticker: "1AE" },
  { id: "mar-nl-20260907767AA618_FCF2_43E4_B2FD_69726CF35BFA-0", market: "NL", trade_date: "2026-09-07", disclosed_date: "2026-09-07T00:00:00Z", reporter: { name: "Borgions F.", role: "Chief Technology Innovation Officer", is_closely_associated: false }, company: "argenx SE", lei: "7245009C5FZE6G9ODQ71", isin: "NL0010832176", nature: "Vervreemding", volume: 47, price: 881.35, currency: "EUR", venue: "EURONEXT - EURONEXT BRUSSELS", is_amendment: false, is_share_programme: true, is_first_time_report: false, status: "Actief", ticker: "1AE" },
];

const rows = (market, dealings) => normaliseFeed(market, { dealings });

test("SE: two notifications from one person on one day stay two rows", () => {
  const out = rows("SE", ARNHULT).sort((a, b) => b.at - a.at);

  assert.equal(out.length, 2);
  const [late, early] = out;

  assert.equal(late.legs, 2);
  assert.equal(late.shares, 64697 + 125000);
  close(late.value, 64697 * 2.51 + 125000 * 2.4772, "23:44 value");
  close(late.price, (64697 * 2.51 + 125000 * 2.4772) / 189697, "23:44 vwap");
  assert.equal(late.tradeDate, "2026-09-08");
  assert.equal(late.atKind, "published");
  assert.ok(late.flags.includes("2 legs"));

  assert.equal(early.legs, 1);
  assert.equal(early.shares, 310000);
  close(early.value, 772520, "17:45 value");
  assert.equal(early.tradeDate, "2026-09-04");
  assert.ok(!early.flags.some((f) => /legs/.test(f)));
  assert.notEqual(late.key, early.key);
});

test("SE: one notification covering three days of buying is one row", () => {
  const out = rows("SE", HELMERSSON);

  assert.equal(out.length, 1);
  assert.equal(out[0].legs, 3);
  assert.equal(out[0].shares, 20000);
  close(out[0].value, 9900 * 17.567 + 1600 * 17.09 + 8500 * 17.372, "value");
  // The latest trade names the row.
  assert.equal(out[0].tradeDate, "2026-09-16");
  assert.equal(out[0].side, "buy");
});

test("SE: revised originals are dropped, so a correction is not summed with what it replaced", () => {
  const out = rows("SE", LARSSON);

  // Three of the five rows are "Reviderad". Before the fix: four rows, one of
  // them a 504-share grant made of a correction plus its own original.
  assert.equal(out.length, 2);
  const grant = out.find((r) => r.action === "Grant");
  const buy = out.find((r) => r.action === "Bought");

  assert.equal(grant.shares, 252);
  assert.equal(grant.legs, 1);
  close(grant.value, 252 * 266.2, "grant value");
  assert.ok(grant.flags.includes("Amendment"));
  assert.equal(buy.shares, 250);
  close(buy.price, 266.212335, "corrected price");
});

test("NL: legs of one AFM notification merge", () => {
  const out = rows("NL", GRIFFITH);

  assert.equal(out.length, 1);
  assert.equal(out[0].legs, 2);
  assert.equal(out[0].shares, 5767 + 6141);
  close(out[0].value, 5767 * 14.05 + 6141 * 14.1, "value");
  assert.equal(out[0].currency, "USD");
  assert.equal(out[0].atKind, "day");
});

test("NL: two AFM notifications on one day stay separate, and each splits by direction", () => {
  const out = rows("NL", BORGIONS);

  // Two meldingids, each an exercise pair (a purchase leg and a sale leg).
  // Before the fix: two rows of 1,547 shares with the two sales summed.
  assert.equal(out.length, 4);
  const sales = out.filter((r) => r.side === "sell").sort((a, b) => b.shares - a.shares);
  const buys = out.filter((r) => r.side === "buy");

  assert.deepEqual(sales.map((r) => r.shares), [1500, 47]);
  close(sales[0].value, 1500 * 862.12, "first sale");
  close(sales[1].value, 47 * 881.35, "second sale");
  assert.deepEqual(buys.map((r) => r.shares).sort((a, b) => a - b), [47, 1500]);
  assert.ok(out.every((r) => r.legs === 1));
  assert.equal(new Set(out.map((r) => r.key)).size, 4);
});

test("EU rows without a provable notification are never summed", () => {
  const [a, b] = GRIFFITH;
  const out = rows("NL", [
    { ...a, id: "unexpected-shape-1" },
    { ...b, id: "unexpected-shape-2" },
  ]);

  assert.equal(out.length, 2);
});

test("row keys are stable across renderers and polls", () => {
  const once = rows("SE", ARNHULT).map((r) => r.key).sort();
  const again = rows("SE", [...ARNHULT].reverse()).map((r) => r.key).sort();

  assert.deepEqual(once, again);
});

// ---------------------------------------------------------------------------
// Links go to the market's owning domain
// ---------------------------------------------------------------------------

const LINKS = {
  UK: "/dealings/abc",
  US: "/us/dealings/0001-P-2",
  SE: "/se/directors/Rutger%20Arnhult",
  NL: "/nl/directors/Borgions%20F.",
  KR: "/kr",
};
const OWNER = { UK: "ddbx.uk", US: "ddbx.us", SE: "ddbx.eu", NL: "ddbx.eu", KR: "ddbx.uk" };

test("a row links relative only on the domain that owns its market", () => {
  for (const host of ["ddbx.uk", "www.ddbx.uk", "ddbx.us", "ddbx.eu"]) {
    for (const [market, href] of Object.entries(LINKS)) {
      const got = tapeRowHref({ market, href }, host);
      const expected =
        OWNER[market] === host.replace(/^www\./, "") ? href : `https://${OWNER[market]}${href}`;

      assert.equal(got, expected, `${market} on ${host}`);
    }
  }
});

test("a UK path is not claimed by ddbx.us just because it has no prefix", () => {
  assert.equal(tapeRowHref({ market: "UK", href: "/dealings/x" }, "ddbx.us"), "https://ddbx.uk/dealings/x");
});

test("local and preview hosts keep the path", () => {
  for (const host of ["localhost", "ddbx-site.pages.dev"]) {
    for (const [market, href] of Object.entries(LINKS)) {
      assert.equal(tapeRowHref({ market, href }, host), href);
    }
  }
  assert.equal(tapeRowHref({ market: "US", href: null }, "ddbx.uk"), null);
});

test("every normalised market produces a link the helper can place", () => {
  const kr = normaliseFeed("KR", {
    dealings: [{ id: "k1", stock_code: "005930", company: "삼성전자", company_en: "Samsung", reporter_name: "x", shares_change: 10, value_krw: 5e7, disclosed_date: "20260916" }],
  });

  assert.equal(tapeRowHref(kr[0], "ddbx.us"), "https://ddbx.uk/kr");
  assert.equal(tapeRowHref(rows("SE", HELMERSSON)[0], "ddbx.uk"), "https://ddbx.eu/se/directors/Andreas%20Helmersson");
});

// ---------------------------------------------------------------------------
// Poll state: outage, recovery, partial failure
// ---------------------------------------------------------------------------

const row = (market, key, day = "2026-09-16", at = Date.parse(`${day}T10:00:00Z`)) => ({
  key: `${market}|${key}`,
  market,
  disclosedDate: day,
  at,
});

/** Feeds with `ok` markets answering the given rows; everything else failed.
 *  `requested` is above the row count so no feed binds the floor. */
function feeds(ok) {
  const out = {};

  for (const m of TAPE_MARKETS) {
    out[m.id] = ok[m.id]
      ? { status: "ok", rows: ok[m.id], raw: ok[m.id].length, requested: 999, fetchedAt: 0 }
      : { status: "failed", rows: [], raw: 0, requested: 999, fetchedAt: 0 };
  }

  return out;
}

test("an outage on the first load, then a good poll, draws the tape", () => {
  let s = initialTapeState(null);

  s = applyTapeFeeds(s, feeds({}), 1);
  assert.equal(s.down, true);
  assert.equal(s.rows.length, 0);
  assert.deepEqual(s.failed.sort(), ["KR", "NL", "SE", "UK", "US"]);

  s = applyTapeFeeds(s, feeds({ UK: [row("UK", "a")], SE: [row("SE", "b")] }), 2);
  assert.equal(s.down, false);
  assert.equal(s.rows.length, 2, "recovered rows are on the page");
  assert.equal(s.pending.length, 0, "not hidden behind the pill");
  assert.deepEqual(s.failed.sort(), ["KR", "NL", "US"]);
  assert.equal(s.refreshedAt, 2);
});

test("a fetch that throws before anything loaded is an outage; after, it changes nothing", () => {
  const first = failTapePoll(initialTapeState(null));

  assert.equal(first.down, true);
  const loaded = applyTapeFeeds(initialTapeState(null), feeds({ UK: [row("UK", "a")] }), 1);

  assert.equal(failTapePoll(loaded), loaded);
});

test("one market down on the first load is named, and its return is named until shown", () => {
  let s = applyTapeFeeds(initialTapeState(null), feeds({ UK: [row("UK", "a")], US: [row("US", "c")] }), 1);

  assert.equal(s.down, false);
  assert.ok(s.failed.includes("SE"));
  assert.equal(s.rows.length, 2);

  s = applyTapeFeeds(s, feeds({ UK: [row("UK", "a")], US: [row("US", "c")], SE: [row("SE", "b")] }), 2);
  assert.ok(!s.failed.includes("SE"));
  assert.deepEqual(s.recovered, ["SE"]);
  assert.equal(s.rows.length, 2, "the list did not move");
  assert.deepEqual(s.pending.map((r) => r.key), ["SE|b"]);

  // Still waiting on the next poll: still named.
  s = applyTapeFeeds(s, feeds({ UK: [row("UK", "a")], US: [row("US", "c")], SE: [row("SE", "b")] }), 3);
  assert.deepEqual(s.recovered, ["SE"]);

  s = showPendingTape(s);
  assert.equal(s.rows.length, 3);
  assert.deepEqual(s.recovered, []);
  assert.deepEqual(s.pending, []);
});

test("a market that fails after loading keeps its rows and is named stale", () => {
  let s = applyTapeFeeds(initialTapeState(null), feeds({ UK: [row("UK", "a")], SE: [row("SE", "b")] }), 1);

  s = applyTapeFeeds(s, feeds({ UK: [row("UK", "a")] }), 2);
  assert.deepEqual(s.stale, ["SE"]);
  assert.ok(!s.failed.includes("SE"));
  assert.equal(s.rows.length, 2);
  assert.equal(s.pending.length, 0);
  assert.equal(s.feeds.SE.status, "ok");

  // Every feed failing after a good load is staleness, not an outage.
  s = applyTapeFeeds(s, feeds({}), 3);
  assert.equal(s.down, false);
  assert.equal(s.rows.length, 2);
});

test("new filings wait in pending; showing them sorts them into place", () => {
  const older = row("UK", "old", "2026-09-15");
  const newer = row("SE", "new", "2026-09-16");
  let s = applyTapeFeeds(initialTapeState(null), feeds({ UK: [older] }), 1);

  s = applyTapeFeeds(s, feeds({ UK: [older], SE: [newer] }), 2);
  assert.deepEqual(s.rows.map((r) => r.key), ["UK|old"]);
  assert.deepEqual(s.pending.map((r) => r.key), ["SE|new"]);
  s = showPendingTape(s);
  assert.deepEqual(s.rows.map((r) => r.key), ["SE|new", "UK|old"]);
});

test("the grouping change flows through the merge: the tape counts notifications", () => {
  const se = rows("SE", [...ARNHULT, ...HELMERSSON, ...LARSSON]);
  const nl = rows("NL", [...GRIFFITH, ...BORGIONS]);
  const { rows: merged } = mergeTape(
    feeds({ SE: se.map((r) => r), NL: nl.map((r) => r) }),
  );

  assert.equal(merged.length, 2 + 1 + 2 + 1 + 4);
});

// ---------------------------------------------------------------------------
// Market states: every covered market accounted for, in both renderers
// ---------------------------------------------------------------------------

test("a quiet market is named with the date of its newest filing, and the count says 'of 5'", () => {
  const nl = { ...row("NL", "old", "2026-09-07"), disclosedDate: "2026-09-07" };
  const f = feeds({
    SE: [row("SE", "a", "2026-09-15"), row("SE", "b", "2026-09-14")],
    UK: [row("UK", "c", "2026-09-15")],
    US: [row("US", "d", "2026-09-13")],
    KR: [row("KR", "e", "2026-09-16")],
    NL: [nl],
  });
  // Rows at or after a floor of 12 Sept: the Dutch row is below it.
  const onTape = ["SE", "UK", "US", "KR"].flatMap((id) => f[id].rows);
  const states = tapeMarketStates(f, onTape);
  const summary = tapeSummary(onTape, states, "2026-09-12");

  assert.equal(
    summary,
    "5 filings from 4 of 5 markets since 12 Sept, newest first: 2 from Sweden, 1 from Korea, 1 from the UK and 1 from the US. The Netherlands has had no filings since 7 Sept, so it has no rows in this span.",
  );
  const nlState = states.find((s) => s.id === "NL");

  assert.equal(nlState.state, "quiet");
  assert.equal(nlState.latest, "2026-09-07");
  assert.match(tapeCoverageNow(nlState, "2026-09-12"), /^No filings since 7 Sept/);
  assert.equal(tapeCoverageNow(states.find((s) => s.id === "SE"), "2026-09-12"), "2 filings on the tape since 12 Sept");
});

test("a failed market is not counted and not called quiet", () => {
  const f = feeds({ UK: [row("UK", "a")] });
  const states = tapeMarketStates(f, f.UK.rows);

  assert.equal(states.find((s) => s.id === "SE").state, "failed");
  assert.equal(tapeSummary(f.UK.rows, states, null), "1 filing from 1 of 5 markets since 16 Sept, newest first.");
});

test("shouted EDGAR issuer names are recased", () => {
  const [us] = normaliseFeed("US", {
    dealings: [{ id: "u1", company: "TERAWULF INC.", ticker: "WULF", transaction_code: "P", reporter: { name: "BUCELLA MICHAEL C" }, disclosed_date: "2026-09-16" }],
  });

  assert.equal(us.company, "Terawulf Inc.");
});
