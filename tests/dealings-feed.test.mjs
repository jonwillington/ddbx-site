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
