import { test } from "node:test";
import assert from "node:assert/strict";

import {
  citedFilings,
  editionMeetsBar,
  editionModel,
  fetchArchive,
  fetchEdition,
  groupByDay,
  sitemapDays,
  summaryBody,
} from "../shared/days.js";

/** A fake /api/{dealings,us-dealings} + /api/daily-summary with the real
 *  window semantics: `since` inclusive and `before` EXCLUSIVE on
 *  disclosed_date, newest first, `limit` rows. `summaries` is the set of dates
 *  that have one. Records every URL. */
function fakeApi(rows, { summaries = [], calls = [] } = {}) {
  const sorted = [...rows].sort((a, b) =>
    a.disclosed_date === b.disclosed_date
      ? (a.id < b.id ? 1 : -1)
      : a.disclosed_date < b.disclosed_date ? 1 : -1,
  );

  return async (url) => {
    calls.push(url);
    const u = new URL(url);
    const q = u.searchParams;

    if (u.pathname.endsWith("/daily-summary")) {
      const has = summaries.includes(q.get("date"));

      return {
        ok: has,
        status: has ? 200 : 404,
        json: async () => ({ summary: { headline: "h", body: "b" }, cited: [] }),
      };
    }
    const since = q.get("since");
    const before = q.get("before");
    const limit = Number(q.get("limit") ?? 1000);
    const out = sorted
      .filter((r) => (!since || r.disclosed_date >= since) && (!before || r.disclosed_date < before))
      .slice(0, limit);

    return { ok: true, status: 200, json: async () => ({ dealings: out }) };
  };
}

const API = "https://api.test/api";
const row = (id, disclosed, extra = {}) => ({
  id,
  disclosed_date: disclosed,
  trade_date: disclosed,
  ticker: `T${id}`,
  company: `Co ${id}`,
  value_gbp: 1000,
  ...extra,
});

test("the archive keeps a late disclosure of an old trade on its announcement day", async () => {
  const rows = [
    row("a", "2026-09-15"),
    // Traded in 2024, announced 15 Sep 2026: the PCTN.L / BMA shape.
    row("late", "2026-09-15", { trade_date: "2024-03-13" }),
  ];
  const archive = await fetchArchive({ apiBase: API, market: "UK", fetchImpl: fakeApi(rows) });
  const edition = await fetchEdition({ apiBase: API, market: "UK", date: "2026-09-15", fetchImpl: fakeApi(rows) });

  assert.equal(archive.days[0].date, "2026-09-15");
  assert.equal(archive.days[0].count, 2);
  assert.equal(edition.model.count, 2);
});

test("archive and edition agree on every day, across a page boundary", async () => {
  // 1,300 rows over six trading days, so the walk needs a second page and the
  // first page ends part-way through a day.
  const days = ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-14", "2026-09-15"];
  const rows = [];

  for (let i = 0; i < 1300; i++) {
    rows.push(
      row(`r${String(i).padStart(4, "0")}`, days[i % days.length], {
        analysis: i % 7 === 0 ? { rating: "noteworthy" } : null,
      }),
    );
  }

  const archive = await fetchArchive({ apiBase: API, market: "UK", fetchImpl: fakeApi(rows) });

  assert.equal(archive.complete, true);
  assert.equal(archive.days.reduce((n, d) => n + d.count, 0), 1300);
  for (const day of archive.days) {
    const edition = await fetchEdition({ apiBase: API, market: "UK", date: day.date, fetchImpl: fakeApi(rows) });

    assert.equal(edition.model.count, day.count, day.date);
    assert.equal(edition.model.rated, day.rated, day.date);
  }
});

test("groupByDay and editionModel bucket a timestamped disclosed_date the same way", () => {
  const rows = [row("a", "2026-09-15T07:00:00Z"), row("b", "2026-09-15"), row("c", "2026-09-14")];
  const { days } = groupByDay(rows, "UK");

  assert.equal(days.find((d) => d.date === "2026-09-15").count, 2);
  assert.equal(editionModel(rows, "UK", "2026-09-15").count, 2);
});

test("US edition and archive both read the whole record", async () => {
  const calls = [];
  const api = fakeApi([], { calls });

  await fetchEdition({ apiBase: API, market: "US", date: "2026-09-15", fetchImpl: api });
  await fetchArchive({ apiBase: API, market: "US", fetchImpl: api });
  const feedCalls = calls.filter((u) => u.includes("/us-dealings"));

  assert.ok(feedCalls.length >= 2);
  for (const u of feedCalls) assert.match(u, /view=all/);

  const uk = [];

  await fetchEdition({ apiBase: API, market: "UK", date: "2026-09-15", fetchImpl: fakeApi([], { calls: uk }) });
  assert.doesNotMatch(uk.find((u) => u.includes("/dealings")), /view=/);
});

test("an outage is not an empty archive", async () => {
  const down = async () => ({ ok: false, status: 503, json: async () => ({}) });
  const archive = await fetchArchive({ apiBase: API, market: "UK", fetchImpl: down });

  assert.equal(archive.failed, true);
  assert.equal(archive.complete, false);

  const empty = await fetchArchive({ apiBase: API, market: "UK", fetchImpl: fakeApi([]) });

  assert.equal(empty.failed, false);
  assert.equal(empty.days.length, 0);
});

test("the indexability bar: a summary, or three filings with one rated", () => {
  assert.equal(editionMeetsBar({ count: 1, rated: 1 }), false);
  assert.equal(editionMeetsBar({ count: 5, rated: 0 }), false);
  assert.equal(editionMeetsBar({ count: 3, rated: 1 }), true);
  assert.equal(editionMeetsBar({ count: 1, rated: 0 }, true), true);
  assert.equal(editionMeetsBar({ count: 0, rated: 0 }), false);
});

test("the sitemap leaves out thin days and today until its summary lands", async () => {
  const rated = { analysis: { rating: "minor" } };
  const rows = [
    // Thick past day: three filings, one rated.
    row("p1", "2026-09-14", rated), row("p2", "2026-09-14"), row("p3", "2026-09-14"),
    // Thin past day without a summary, and one with.
    row("t1", "2026-09-11"),
    row("s1", "2026-09-10"),
    // Today, thick, no summary yet.
    row("n1", "2026-09-15", rated), row("n2", "2026-09-15"), row("n3", "2026-09-15"),
  ];
  // Midday in London on 15 Sep.
  const now = new Date("2026-09-15T11:00:00Z");

  const before = await sitemapDays({
    apiBase: API, market: "UK", now, fetchImpl: fakeApi(rows, { summaries: ["2026-09-10"] }),
  });

  assert.deepEqual(before.days.map((d) => d.date), ["2026-09-14", "2026-09-10"]);

  const after = await sitemapDays({
    apiBase: API, market: "UK", now, fetchImpl: fakeApi(rows, { summaries: ["2026-09-10", "2026-09-15"] }),
  });

  assert.deepEqual(after.days.map((d) => d.date), ["2026-09-15", "2026-09-14", "2026-09-10"]);
});

test("a US 10% holder is listed and counted but never the biggest buy", () => {
  const rows = [
    row("fund", "2026-09-15", { value: 9_000_000, value_gbp: undefined, reporter: { name: "Fund LP", roles: ["ten_percent_owner"] } }),
    row("ceo", "2026-09-15", { value: 200_000, value_gbp: undefined, reporter: { name: "A CEO", roles: ["officer"] } }),
  ];
  const model = editionModel(rows, "US", "2026-09-15");

  assert.equal(model.count, 2);
  assert.equal(model.holders, 1);
  assert.equal(model.filings[0].id, "fund");
  assert.equal(model.biggest.id, "ceo");
});

test("the read loses its inline filing ids, and cited legs collapse onto the edition row", () => {
  const body =
    "Director DeSantis added $1M across two tranches (IDs f4-0001628280-26-062057-1-0 and f4-0001628280-26-062057-1-1), five days after. Keel (f4-0001352090-26-000007-1-0, f4-0001626337-26-000011-1-0) too.";

  assert.equal(
    summaryBody({ body }),
    "Director DeSantis added $1M across two tranches, five days after. Keel too.",
  );

  const edition = row("f4-x-1-0", "2026-09-15", { filing_id: "x", reporter: { cik: "1" } });
  const model = editionModel([edition], "US", "2026-09-15");
  const cited = [
    { ...edition, id: "f4-x-1-0" },
    { ...edition, id: "f4-x-1-1" },
    row("elsewhere", "2026-09-12"),
  ];
  const { rows, ids } = citedFilings(model, cited);

  assert.deepEqual(rows.map((r) => r.id), ["f4-x-1-0", "elsewhere"]);
  assert.deepEqual([...ids], ["f4-x-1-0"]);
});
