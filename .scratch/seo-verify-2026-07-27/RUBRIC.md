# SEO verify-round rubric (2026-07-27)

This is a **verify-style** second pass after commit `2048451`
(`feat(seo): rebuild the SEO family on one shell, and fix what the review found`).
Do **not** blank-slate redesign. Your job is to try to **refute** the previous
round's fixes: find what still fails, what regressed, what was claimed fixed
but isn't, and what the new shell conventions require that pages still miss.

## Shell conventions (mandatory grammar — judge against these)

From `project_seo_shell.md` / commit 2048451:

- `SeoPageShell` — crumbs → eyebrow → h1 → standfirst → notice → children →
  AppCtaBand → ruled footnote. While `loading`, skeleton replaces children AND
  band+footnote are suppressed. New SEO pages must use it, not hand-rolled headers.
- `SeoSkeleton` — variants: ruled-list / ranked-board / sheet-stack /
  doc-sections / stat-tiles; pass the real row count when knowable.
- `SeoSection` — stacked + rail variants; brokers' `PageSection` wraps it.
- `RelatedCards` — tile-card onward links; never bare underlined link lists.
- `cta-copy.ts` — per-family band copy; bodies must NOT converge on one
  sentence; `leaderboardCta(year?)` is a function.
- Index routes `/sectors`, `/learn`, `/reports` have pre-render Functions and
  are on the middleware skip list — a new indexable SEO route needs its
  Function to own the whole `<head>`.

## Design vocabulary (from uplift doc §2 — style reference only)

Sheets, tiles, chips, DeltaBadge, MeterBar, mono brown eyebrows, dark
conversion band, CompanyLogo, ticker pills, `text-positive`/`text-negative`
(not local emerald/rose). Judge today's code; don't trust the uplift doc's
pre-rebuild diagnosis.

## Per-module walk (top → bottom)

For every distinct module on the page, force a verdict:

| Verdict | Meaning |
|---|---|
| **keep** | Best version of itself; leave alone |
| **tune** | Small copy/token/spacing fix; cite file:line |
| **redesign** | Module shape is wrong; propose concrete replacement |
| **move** | Content is fine but in the wrong place |
| **cut** | Remove; hurts more than it helps |

Score each module on:

1. **Isolation** — best version of itself, or stock? House vocabulary it should speak but doesn't?
2. **New user** — cold Google landing: unexplained jargon, numbers without framing?
3. **Funnel** — contextual app push, or generic/missing CTA?
4. **Placement** — first screenful vs buried; body vs rail?
5. **Skeleton** — loading state matches loaded layout structure, heights, row counts?
6. **Plus** — dark mode, mobile, dead ends, token violations (hexes that should be tokens, emerald/rose, etc.)

## Hard constraints (locked — do not "fix" these)

1. **Text parity**: facts in `functions/*` pre-renders must remain visible text
   on the hydrated React page. Shared `shared/*.js` copy changes must update
   matching `functions/*` in the same change. Do not invent facts for
   crawlers that readers never see, or strip pre-render facts from React.
2. **Brokers FCA/ASA**: BrokerDisclosure must stay visible wherever affiliate
   links appear. Do not rewrite category intros into unsubstantiated
   "best" claims. Affiliate ask and app CTA must not compete in one viewport
   (broker guides use quiet CTA, `media: "none"`).
3. **Open decisions left deliberately** (do not reopen unless you find a
   concrete bug): company h1 disagreement (pre-render vs React — both must
   move together); insider names kept OUT of sector pre-renders; US-report
   currency hardcodes carry `TODO(us-reports)`.
4. **House style**: plain, specific, no hype, no return promises. App claim
   is timeliness/completeness, never performance.

## Verify focus (this round's added job)

For each prior claim below, either **confirm held** with file:line evidence,
or **refute** with what's still broken:

- Family uses SeoPageShell with correct order and loading suppression
- Real SeoSkeleton matching layout (not a generic pulse block)
- Eyebrow present and family-correct
- Terminal AppCtaBand (not mid-page) with non-converged family copy
- RelatedCards instead of bare link lists
- Pre-render ↔ React parity (no inversions)
- Brokers: unconditional BrokerDisclosure on /brokers and /brokers/:slug
- Leaderboard "now worth" uses disclosure-close baseline
- Learn live examples follow entry jurisdiction, not host
- Sector pages handle 1000-row cap / truncation messaging
- ddbx.us does not sell UK brokers in the rail
- Report pages carry AI-assistance byline
- Index pre-renders for /sectors, /learn, /reports

## Required output shape

```
## Family: <name>
## Routes reviewed: …
## Files read: …

### Prior claims — held / refuted
- [held|refuted] <claim> — evidence …

### Per-module verdicts
1. <module name> — **VERDICT** — file:line — one concrete fix (or "none")
…

### Bugs (correctness / compliance / parity)
- …

### Ranked top-5 (effort: S/M/L)
1. …
```

Be ruthless. Prefer concrete file:line findings over taste. If a page is
genuinely good, say so with keep verdicts — do not invent work.
