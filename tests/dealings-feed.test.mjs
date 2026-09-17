import { test } from "node:test";
import assert from "node:assert/strict";

import { fetchDealingsWindow } from "../shared/dealings-feed.js";

function fakeFetch(rows, calls = []) {
  return async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ dealings: rows }) };
  };
}

// A late disclosure: traded in July, announced in the window.
const late = { id: "late", trade_date: "2026-07-01", disclosed_date: "2026-09-10T07:00:00Z" };
const normal = { id: "normal", trade_date: "2026-09-09", disclosed_date: "2026-09-10T07:00:00Z" };
const early = { id: "early", trade_date: "2026-09-09", disclosed_date: "2026-09-09T16:00:00Z" };

test("default window filters on trade date (board behaviour unchanged)", async () => {
  const { dealings } = await fetchDealingsWindow({
    apiBase: "x", market: "UK", since: "2026-09-01", fetchImpl: fakeFetch([late, normal]),
  });
  assert.deepEqual(dealings.map((d) => d.id), ["normal"]);
});

test("windowOn=disclosed keeps a late disclosure of an old trade", async () => {
  const { dealings } = await fetchDealingsWindow({
    apiBase: "x", market: "UK", since: "2026-09-10", windowOn: "disclosed",
    fetchImpl: fakeFetch([late, normal, early]),
  });
  assert.deepEqual(dealings.map((d) => d.id).sort(), ["late", "normal"]);
});

test("windowOn=disclosed bounds `until` by calendar day, ignoring the time", async () => {
  const { dealings } = await fetchDealingsWindow({
    apiBase: "x", market: "UK", since: "2026-09-01", until: "2026-09-09", windowOn: "disclosed",
    fetchImpl: fakeFetch([late, early]),
  });
  assert.deepEqual(dealings.map((d) => d.id), ["early"]);
});

test("view passes through for US only", async () => {
  const us = [];
  await fetchDealingsWindow({ apiBase: "x", market: "US", since: "2026-09-01", view: "all", fetchImpl: fakeFetch([], us) });
  assert.match(us[0], /view=all/);

  const uk = [];
  await fetchDealingsWindow({ apiBase: "x", market: "UK", since: "2026-09-01", view: "all", fetchImpl: fakeFetch([], uk) });
  assert.doesNotMatch(uk[0], /view=/);
});

test("no view by default keeps the curated US feed", async () => {
  const calls = [];
  await fetchDealingsWindow({ apiBase: "x", market: "US", since: "2026-09-01", fetchImpl: fakeFetch([], calls) });
  assert.doesNotMatch(calls[0], /view=/);
});

/** An API that behaves like /api/dealings: disclosed_date DESC, `since`
 *  inclusive, `before` EXCLUSIVE and date-only, `limit` capped. */
function fakeApi(all, pageCap) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const q = new URL(url, "http://x").searchParams;
    const since = q.get("since");
    const before = q.get("before");
    const limit = Math.min(Number(q.get("limit")), pageCap);
    const rows = all
      .filter((d) => d.disclosed_date.slice(0, 10) >= since)
      .filter((d) => !before || d.disclosed_date.slice(0, 10) < before)
      .sort((a, b) => b.disclosed_date.localeCompare(a.disclosed_date) || a.id.localeCompare(b.id))
      .slice(0, limit);
    return { ok: true, json: async () => ({ dealings: rows }) };
  };
  return { impl, calls };
}

function day(date, n, prefix = date) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i}`, trade_date: date, disclosed_date: date,
  }));
}

test("paging does not lose the rows of a day split across a page break", async (t) => {
  // PAGE is 1000 in the module; build >1000 rows with a heavy boundary day.
  const all = [...day("2026-09-10", 700), ...day("2026-09-09", 600), ...day("2026-09-08", 400)];
  const { impl } = fakeApi(all, 1000);
  const { dealings, complete } = await fetchDealingsWindow({
    apiBase: "http://x", market: "UK", since: "2026-09-01", windowOn: "disclosed", fetchImpl: impl,
  });
  assert.equal(dealings.length, 1700);
  assert.equal(dealings.filter((d) => d.disclosed_date === "2026-09-09").length, 600);
  assert.equal(complete, true);
});

test("a single day larger than a page stops and says incomplete", async () => {
  const all = [...day("2026-09-10", 1200)];
  const { impl, calls } = fakeApi(all, 1000);
  const { complete } = await fetchDealingsWindow({
    apiBase: "http://x", market: "UK", since: "2026-09-01", windowOn: "disclosed", fetchImpl: impl,
  });
  assert.equal(complete, false);
  assert.ok(calls.length <= 3);
});
