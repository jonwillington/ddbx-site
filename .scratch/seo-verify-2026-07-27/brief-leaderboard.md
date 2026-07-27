# Implementer brief — LEADERBOARD

Read `leaderboard.md` and `SYNTHESIS.md` in the same scratch dir.

## Foundations already landed
- Methodology disclosure-baseline sentence already qualified in `shared/leaderboard.js` (do not re-edit shared/leaderboard.js unless you must for sample-size copy shared with pre-render)
- `shared/tracking.js` exists; shell footnote is a block

## Allowlist ONLY
- `src/pages/biggest-buys.tsx`
- `functions/biggest-buys/[[route]].js`
- `shared/leaderboard.js` / `.d.ts` only if sample-size or archiveYears fix needs it
- Do NOT edit `functions/sitemap.xml.js` — main session owns it; if you fix `archiveYears` in shared/leaderboard.js the sitemap will pick it up

## Must-land
1. Pass a shell `footnote` (past-performance line; LogoDevAttribution ok in the block)
2. Distinguish API failure from empty board (page + pre-render: don't noindex indexed URL on fetch blip)
3. Qualify median-alpha tile with sample size (N of M) — match sector-ui wording; keep React ↔ pre-render parity
4. Move mobile cross-links below year archive; render with `RelatedCards`
5. If easy: exclude current year from archiveYears/sitemap until the year has started producing boards / or until pre-render would index it — follow the report's recommendation

## Rules
- No commits/builds/deploys
- `npx tsc --noEmit` before finish
- Per-file summary + deliberate skips
