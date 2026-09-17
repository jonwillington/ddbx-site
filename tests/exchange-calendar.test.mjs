import { test } from "node:test";
import assert from "node:assert/strict";

import {
  closureReason, isDateSlug, isTradingDay, prevTradingDay, tradingDaysBetween,
} from "../shared/exchange-calendar.js";

test("impossible dates are not date slugs", () => {
  assert.equal(isDateSlug("2026-02-31"), false);
  assert.equal(isDateSlug("2026-9-1"), false);
  assert.equal(isDateSlug("2026-09-01"), true);
});

test("the summer bank holiday closes London but not New York", () => {
  assert.deepEqual(closureReason("2026-08-31", "UK"), { kind: "holiday", name: "the summer bank holiday" });
  assert.equal(isTradingDay("2026-08-31", "US"), true);
  assert.equal(isTradingDay("2026-09-07", "US"), false);
});

test("sessions skip weekends and holidays", () => {
  assert.equal(prevTradingDay("2026-09-01", "UK"), "2026-08-28");
  assert.deepEqual(tradingDaysBetween("2026-08-28", "2026-09-02", "UK"), ["2026-08-28", "2026-09-01", "2026-09-02"]);
});
