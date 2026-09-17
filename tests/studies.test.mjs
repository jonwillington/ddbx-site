import { test } from "node:test";
import assert from "node:assert/strict";

import {
  clusteredSlope,
  cochranArmitageZ,
  computeStudy,
  designEffect,
  normCdf,
  studyBySlug,
  studyPath,
  parseResearchPath,
  tCritical,
  tTwoSidedP,
  HORIZON_DAYS,
} from "../shared/studies.js";

const close = (actual, expected, tol, msg) =>
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${msg ?? ""} expected ${expected}, got ${actual}`,
  );

// ---------------------------------------------------------------------------
// Distributions. Reference values from scipy.stats 1.13.
// ---------------------------------------------------------------------------

test("normCdf matches known values (the erf(x/√2) fix)", () => {
  close(normCdf(1.96), 0.9750021, 1e-6, "Φ(1.96)");
  close(normCdf(1), 0.8413447, 1e-6, "Φ(1)");
  close(normCdf(0), 0.5, 1e-9, "Φ(0)");
  close(normCdf(-1.645), 0.0499849, 1e-6, "Φ(-1.645)");
  // The old bug computed Φ(x√2): Φ(1.96) came out at 0.9972.
  assert.ok(normCdf(1.96) < 0.976);
});

test("t distribution: two-sided p and critical values", () => {
  close(tTwoSidedP(2, 10), 0.0733880, 1e-6, "p(t=2, df=10)");
  close(tCritical(10), 2.2281389, 1e-5, "t crit df=10");
  close(tCritical(60), 2.0002978, 1e-5, "t crit df=60");
  close(tTwoSidedP(0, 30), 1, 1e-9, "p(t=0)");
});

// ---------------------------------------------------------------------------
// Clustered inference. Reference values from statsmodels 0.14 OLS with
// cov_type="cluster", use_t=True, on the identical observations.
// ---------------------------------------------------------------------------

/** One company contributes 40 identical outcomes to cell A. */
function oneBigCompany() {
  const obs = [];

  for (let i = 0; i < 40; i++) obs.push({ x: 1, y: 1, g: "BIG" });
  for (let i = 0; i < 40; i++) obs.push({ x: 1, y: i % 2, g: `a${i}` });
  for (let i = 0; i < 80; i++) obs.push({ x: 0, y: i % 3 === 0 ? 1 : 0, g: `b${i}` });

  return obs;
}

test("clustered SE is much wider than naive when one company repeats", () => {
  const fit = clusteredSlope(oneBigCompany());

  close(fit.estimate, 0.4125, 1e-9, "difference in rates");
  close(fit.se, 0.143781, 1e-6, "CR1 clustered SE (statsmodels)");
  close(fit.seNaive, 0.072137, 1e-6, "naive SE (statsmodels)");
  close(fit.p, 0.004868, 1e-6, "clustered p on G-1 df (statsmodels)");
  close(fit.interval.lo, 0.127825, 1e-5);
  close(fit.interval.hi, 0.697175, 1e-5);
  assert.equal(fit.clusters, 121);
  assert.ok(fit.se > 1.9 * fit.seNaive, "clustering roughly doubles the SE");
});

test("with every purchase its own company, clustering changes little", () => {
  const obs = oneBigCompany().map((o, i) => ({ ...o, g: i }));
  const fit = clusteredSlope(obs);

  assert.ok(fit.se < 1.1 * fit.seNaive && fit.se > 0.9 * fit.seNaive);
});

test("design effect of a proportion", () => {
  const indep = Array.from({ length: 100 }, (_, i) => ({ y: i % 2, g: i }));
  const clumped = Array.from({ length: 100 }, (_, i) => ({
    y: i < 50 ? 1 : 0,
    g: Math.floor(i / 10),
  }));

  close(designEffect(indep), 1, 0.02);
  assert.ok(designEffect(clumped) > 8, "ten companies of ten identical outcomes");
});

test("trend test on a known table", () => {
  // Beats / purchases per ordered band.
  const table = [
    { beats: 12, n: 30 },
    { beats: 18, n: 32 },
    { beats: 20, n: 31 },
    { beats: 25, n: 33 },
  ];

  // Classical Cochran-Armitage, cross-checked with an independent numpy
  // implementation of the same formula.
  close(cochranArmitageZ(table), 2.942558, 1e-5, "CA z");

  const obs = [];

  table.forEach(({ beats, n }, band) => {
    for (let j = 0; j < n; j++) {
      obs.push({ x: band, y: j < beats ? 1 : 0, g: `t${band}-${Math.floor(j / 2)}` });
    }
  });
  const fit = clusteredSlope(obs);

  close(fit.estimate, 0.115134, 1e-6, "slope per band (statsmodels)");
  close(fit.se, 0.051461, 1e-6, "clustered SE (statsmodels)");
  close(fit.p, 0.028812, 1e-6, "clustered p (statsmodels)");
  assert.equal(fit.clusters, 64);

  // As singletons the clustered trend lands next to the classical statistic.
  const singles = clusteredSlope(obs.map((o, i) => ({ ...o, g: i })));

  close(singles.t, cochranArmitageZ(table), 0.2, "singleton t ≈ CA z");
});

// ---------------------------------------------------------------------------
// The sample: fixed horizon, admission, dataset version, indexability.
// ---------------------------------------------------------------------------

const TODAY = "2026-09-17";

function addDays(iso, days) {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

/** A UK purchase row with a role and an optional cluster tag. */
function ukRow(id, { ticker, role, disclosed, value = 20_000, cluster = null }) {
  return {
    id,
    ticker,
    tx_type: "buy",
    is_open_market_buy: true,
    trade_date: disclosed,
    disclosed_date: disclosed,
    value_gbp: value,
    director: { name: `Person ${id}`, role },
    cluster,
    // A live mark that would have admitted the row under the old rule. The
    // fixed-horizon rule must ignore it.
    live_performance: { alpha_pct_disclosed: 50, as_of: TODAY },
  };
}

function outcome(id, abnormal, disclosed, flags = []) {
  return {
    event_id: id,
    anchor_date: disclosed,
    entry_date: disclosed,
    exit_date: addDays(disclosed, HORIZON_DAYS),
    return_pct: abnormal + 2,
    bench_return_pct: 2,
    abnormal_return_pct: abnormal,
    flags,
  };
}

/** A role-study corpus: `ceo` and `cfo` purchases, each in its own company,
 *  all resolved, plus the edge cases the admission rule has to handle. */
function corpus({ ceo = 40, cfo = 40 } = {}) {
  const rows = [];
  const outs = [];
  const old = "2026-04-01";

  for (let i = 0; i < ceo; i++) {
    rows.push(ukRow(`ceo${i}`, { ticker: `C${i}`, role: "Chief Executive Officer", disclosed: old }));
    outs.push(outcome(`ceo${i}`, i % 5 === 0 ? -3 : 4, old));
  }
  for (let i = 0; i < cfo; i++) {
    rows.push(ukRow(`cfo${i}`, { ticker: `F${i}`, role: "Chief Financial Officer", disclosed: old }));
    outs.push(outcome(`cfo${i}`, i % 2 === 0 ? -3 : 4, old));
  }

  return { rows, outs };
}

test("fixed horizon: only clean, elapsed outcomes are admitted", () => {
  const study = studyBySlug("ceo-vs-cfo");
  const { rows, outs } = corpus({ ceo: 3, cfo: 0 });
  const recent = addDays(TODAY, -30);
  const elapsed = "2026-05-01";

  // Pending: 90 days not yet passed, no outcome, a big live mark.
  rows.push(ukRow("pending", { ticker: "P", role: "Chief Executive Officer", disclosed: recent }));
  // Flagged: the series stopped short.
  rows.push(ukRow("stale", { ticker: "S", role: "Chief Executive Officer", disclosed: elapsed }));
  outs.push(outcome("stale", 10, elapsed, ["stale_exit"]));
  // Split artefact.
  rows.push(ukRow("split", { ticker: "X", role: "Chief Executive Officer", disclosed: elapsed }));
  outs.push(outcome("split", 250, elapsed, ["extreme"]));
  // Elapsed with no outcome row: no prices on file.
  rows.push(ukRow("unpriced", { ticker: "U", role: "Chief Executive Officer", disclosed: elapsed }));

  const r = computeStudy(study, rows, outs, "UK", TODAY);
  const ceo = r.cells.find((c) => c.id === "ceo");

  assert.equal(ceo.n, 3, "only the three clean outcomes are scored");
  assert.equal(ceo.pending, 1);
  assert.equal(r.universe.flagged, 2);
  assert.equal(r.universe.unpriced, 1);
  assert.equal(r.universe.pending, 1);
  assert.equal(r.horizonDays, 90);
});

test("a purchase is scored on its outcome, not its live mark", () => {
  const study = studyBySlug("ceo-vs-cfo");
  const { rows, outs } = corpus();
  const r = computeStudy(study, rows, outs, "UK", TODAY);
  const ceo = r.cells.find((c) => c.id === "ceo");
  const cfo = r.cells.find((c) => c.id === "cfo");

  // Every live mark is +50; the outcomes say 80% and 50%.
  close(ceo.beatRate, 0.8, 1e-9);
  close(cfo.beatRate, 0.5, 1e-9);
});

test("dataset version is stable across input order and moves with the sample", () => {
  const study = studyBySlug("ceo-vs-cfo");
  const { rows, outs } = corpus();
  const a = computeStudy(study, rows, outs, "UK", TODAY);
  const b = computeStudy(study, [...rows].reverse(), [...outs].reverse(), "UK", TODAY);

  assert.equal(a.dataset.id, b.dataset.id);
  assert.match(a.dataset.id, /^\d{4}-\d{2}-\d{2}\.[0-9a-f]{12}$/);

  const changed = outs.map((o, i) =>
    i === 0 ? { ...o, abnormal_return_pct: o.abnormal_return_pct - 20 } : o,
  );
  const c = computeStudy(study, rows, changed, "UK", TODAY);

  assert.notEqual(a.dataset.hash, c.dataset.hash);
});

test("floors are in companies as well as purchases", () => {
  const study = studyBySlug("ceo-vs-cfo");
  const { rows, outs } = corpus({ ceo: 40, cfo: 0 });
  const old = "2026-04-01";

  // 40 CFO purchases, but from 10 companies.
  for (let i = 0; i < 40; i++) {
    rows.push(ukRow(`f${i}`, { ticker: `FIN${i % 10}`, role: "Chief Financial Officer", disclosed: old }));
    outs.push(outcome(`f${i}`, 4, old));
  }
  const r = computeStudy(study, rows, outs, "UK", TODAY);
  const cfo = r.cells.find((c) => c.id === "cfo");

  assert.equal(cfo.n, 40);
  assert.equal(cfo.companies, 10);
  assert.equal(cfo.beatRate, null, "no rate from ten companies");
  assert.equal(r.verdict.state, "waiting");
  assert.equal(r.verdict.missing[0].neededCompanies, 10);
});

test("waiting ⇒ not indexable; a result ⇒ indexable", () => {
  const study = studyBySlug("ceo-vs-cfo");
  const thin = corpus({ ceo: 40, cfo: 12 });
  const full = corpus({ ceo: 40, cfo: 40 });
  const waiting = computeStudy(study, thin.rows, thin.outs, "UK", TODAY);
  const ready = computeStudy(study, full.rows, full.outs, "UK", TODAY);

  assert.equal(waiting.verdict.state, "waiting");
  assert.equal(waiting.indexable, false);
  assert.notEqual(ready.verdict.state, "waiting");
  assert.equal(ready.indexable, true);
});

// ---------------------------------------------------------------------------
// Pre-render: a waiting study is served with a noindex, a ready one without.
// HTMLRewriter is a Workers global; this stub records what the chain appends.
// ---------------------------------------------------------------------------

class FakeRewriter {
  constructor() {
    this.handlers = [];
  }
  on(selector, handler) {
    this.handlers.push([selector, handler]);

    return this;
  }
  transform(input) {
    const out = { head: [...(input.head ?? [])], body: input.body ?? "" };

    for (const [selector, handler] of this.handlers) {
      handler.element?.({
        append: (html) => selector === "head" && out.head.push(html),
        setInnerContent: (html) => {
          if (selector === "#root") out.body = html;
        },
        setAttribute: () => {},
      });
    }

    return out;
  }
}

async function prerender(path, { rows, outs }) {
  globalThis.HTMLRewriter = FakeRewriter;
  const realFetch = globalThis.fetch;

  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () =>
      String(url).includes("/outcomes?")
        ? { outcomes: outs }
        : { dealings: String(url).includes("before=") ? [] : rows },
  });
  try {
    const { onResearchRequest } = await import("../shared/research-prerender.js");

    return await onResearchRequest(
      {
        request: { url: `https://ddbx.uk${path}` },
        next: async () => ({ head: [], body: "" }),
      },
      "UK",
    );
  } finally {
    globalThis.fetch = realFetch;
  }
}

const robots = (res) => res.head.some((h) => /noindex/.test(h));

test("pre-render noindexes a waiting study and indexes a ready one", async () => {
  const today = new Date().toISOString().slice(0, 10);
  // Dated relative to the real clock, since the Function reads new Date().
  const shift = (c) => {
    const d = addDays(today, -170);

    return {
      rows: c.rows.map((r) => ({ ...r, disclosed_date: d, trade_date: d })),
      outs: c.outs.map((o) => ({ ...o, anchor_date: d })),
    };
  };
  const waiting = await prerender("/research/ceo-vs-cfo", shift(corpus({ ceo: 40, cfo: 12 })));
  const ready = await prerender("/research/ceo-vs-cfo", shift(corpus({ ceo: 40, cfo: 40 })));

  assert.equal(robots(waiting), true);
  assert.match(waiting.body, /Not enough/);
  assert.equal(robots(ready), false);
  assert.ok(ready.head.some((h) => h.includes("https://ddbx.uk/research/ceo-vs-cfo")));
});

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

test("research paths are market-by-path", () => {
  assert.equal(studyPath("ceo-vs-cfo", "US"), "/us/research/ceo-vs-cfo");
  assert.equal(studyPath(null, "UK"), "/research");
  assert.deepEqual(parseResearchPath("/us/research"), { market: "US", study: null });
  assert.equal(parseResearchPath("/research/the-cluster-effect").market, "UK");
  assert.equal(parseResearchPath("/research/nope").study, undefined);
  assert.equal(parseResearchPath("/roles"), null);
});
