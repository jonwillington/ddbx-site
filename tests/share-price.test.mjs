import { test } from "node:test";
import assert from "node:assert/strict";

import { sharePrice } from "../shared/share-price.js";

test("rounds float noise instead of printing it", () => {
  // 40.7p ÷ 100 in floating point — what the UK company page used to print.
  assert.equal(sharePrice(0.40700000000000003, "GBp"), "£0.41");
  assert.equal(sharePrice(40.7 / 100, "GBP"), "£0.41");
});

test("LSE 'GBp' is already pounds: the pound's symbol, no rescaling", () => {
  assert.equal(sharePrice(26.5, "GBp"), "£26.50");
});

test("two places under 1,000, four below 0.1, whole units from 1,000", () => {
  assert.equal(sharePrice(12.56, "USD"), "$12.56");
  assert.equal(sharePrice(0.0075, "GBP"), "£0.0075");
  assert.equal(sharePrice(1234.5, "USD"), "$1235");
});

test("unknown currency prints the number alone", () => {
  assert.equal(sharePrice(5, "SEK"), "5.00");
  assert.equal(sharePrice(5, null), "5.00");
});

test("no figure, no string", () => {
  assert.equal(sharePrice(null, "GBP"), "");
  assert.equal(sharePrice(Number.NaN, "GBP"), "");
});
