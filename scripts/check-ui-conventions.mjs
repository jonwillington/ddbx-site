#!/usr/bin/env node
// UI-conventions ratchet (investigations/2026-09-19-ui-standardisation.md §6).
//
// Counts the one-off values the token system replaces — bracketed font sizes,
// tracking, radii, raw brand hexes, pasted stage recipes — across src/, and
// compares each count against scripts/ui-conventions.baseline.json. A count
// may fall (a sweep migrated some sites) but never rise: new UI uses the
// tokens in src/styles/globals.css, not a fresh literal.
//
//   node scripts/check-ui-conventions.mjs            check (exit 1 on a rise)
//   node scripts/check-ui-conventions.mjs --update   lower the baseline after a sweep
//
// --update refuses to RAISE a number. If a rise is genuinely needed (a
// legitimate new arbitrary value — safe-area max(), shell geometry), add it to
// ALLOW below with a reason instead.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const SRC = join(ROOT, "src");
const BASELINE = join(ROOT, "scripts", "ui-conventions.baseline.json");

/** Each rule: a regex over file text, and what to use instead. */
export const RULES = {
  "text-[px]": {
    re: /\btext-\[\d+(?:\.\d+)?(?:px|rem)\]/g,
    use: "a ramp step: text-caption/small/body/num/lede/title, text-heading, display-doc/stage, eyebrow, micro",
  },
  "tracking-[]": {
    re: /\btracking-\[[^\]]+\]/g,
    use: "the tracking baked into the ramp step (or eyebrow/micro)",
  },
  "leading-[]": {
    re: /\bleading-\[[^\]]+\]/g,
    use: "the leading baked into the ramp step",
  },
  "rounded-[]": {
    re: /\brounded(?:-[trblse]{1,2})?-\[[^\]]+\]/g,
    use: "rounded-mark/control/card/stage/full",
  },
  "shadow-[]": {
    re: /\bshadow-\[[^\]]+\]/g,
    use: "shadow-lift/float/stage",
  },
  "#fcfbf9": {
    re: /#fcfbf9/gi,
    use: "bg-page / --color-page",
  },
  "raw direction hex": {
    re: /#(?:1e6b18|8b2020|5cd84a|e84d4d)\b/gi,
    use: "text-positive / text-negative",
  },
  "raw live green": {
    re: /#(?:2e7d32|7bbe7f)\b/gi,
    use: "text-live / bg-live",
  },
  "emerald/rose": {
    re: /\b(?:text|bg|border|fill|stroke)-(?:emerald|rose|green|red)-\d{2,3}\b/g,
    use: "positive/negative for direction, live for status",
  },
  "max-w-[62ch]": {
    re: /\bmax-w-\[62ch\]/g,
    use: "max-w-measure",
  },
  "raw hairline alpha": {
    re: /\b(?:border|divide)-black\/\[0\.0\d+\]/g,
    use: "border-rule",
  },
};

/** Files a rule doesn't apply to, with the reason. */
const ALLOW = [
  // Token definitions themselves.
  "src/styles/globals.css",
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(tsx?|jsx?|css)$/.test(name)) yield p;
  }
}

export function countAll() {
  const counts = Object.fromEntries(Object.keys(RULES).map((k) => [k, 0]));
  const where = Object.fromEntries(Object.keys(RULES).map((k) => [k, {}]));

  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file);

    if (ALLOW.includes(rel)) continue;
    const text = readFileSync(file, "utf8");

    for (const [key, { re }] of Object.entries(RULES)) {
      const n = text.match(re)?.length ?? 0;

      if (n) {
        counts[key] += n;
        where[key][rel] = n;
      }
    }
  }

  return { counts, where };
}

export function readBaseline() {
  return JSON.parse(readFileSync(BASELINE, "utf8"));
}

export function compare(counts, baseline) {
  return Object.keys(RULES)
    .filter((k) => counts[k] > (baseline[k] ?? 0))
    .map((k) => ({ key: k, now: counts[k], was: baseline[k] ?? 0 }));
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const { counts } = countAll();
  const update = process.argv.includes("--update");
  let baseline = {};

  try {
    baseline = readBaseline();
  } catch {
    if (!update) {
      console.error("No baseline — run with --update once to create it.");
      process.exit(1);
    }
  }

  const rises = compare(counts, baseline);

  if (update) {
    if (rises.length && Object.keys(baseline).length) {
      console.error("Refusing to raise the baseline:");
      for (const r of rises) console.error(`  ${r.key}: ${r.was} → ${r.now}`);
      process.exit(1);
    }
    writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + "\n");
    console.log("Baseline written:", counts);
    process.exit(0);
  }

  for (const [k, n] of Object.entries(counts)) {
    const was = baseline[k] ?? 0;
    const mark = n > was ? "✗" : n < was ? "↓" : " ";

    console.log(`${mark} ${k.padEnd(20)} ${String(n).padStart(5)}  (baseline ${was})`);
  }
  if (rises.length) {
    console.error("\nNew one-off UI values. Use the tokens instead:");
    for (const r of rises) console.error(`  ${r.key} (+${r.now - r.was}): ${RULES[r.key].use}`);
    console.error("\nSee CLAUDE.md \"UI conventions\" and src/styles/globals.css.");
    process.exit(1);
  }
  if (Object.entries(counts).some(([k, n]) => n < (baseline[k] ?? 0))) {
    console.log("\nCounts fell — lock it in with: npm run check:ui -- --update");
  }
}
