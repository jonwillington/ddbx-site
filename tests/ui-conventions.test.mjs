import { test } from "node:test";
import assert from "node:assert/strict";

import {
  compare,
  countAll,
  readBaseline,
  RULES,
} from "../scripts/check-ui-conventions.mjs";

// The ratchet: one-off UI values may only go down. See
// scripts/check-ui-conventions.mjs and CLAUDE.md "UI conventions".
test("no new one-off UI values (text-[px], tracking-[], raw hexes…)", () => {
  const { counts, where } = countAll();
  const rises = compare(counts, readBaseline());

  assert.deepEqual(
    rises.map((r) => ({
      ...r,
      use: RULES[r.key].use,
      files: where[r.key],
    })),
    [],
  );
});
