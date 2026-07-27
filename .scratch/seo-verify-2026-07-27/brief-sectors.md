# Implementer brief — SECTORS

Read `/Users/jonwillington/ddbx-site/.scratch/seo-verify-2026-07-27/sectors.md` and `SYNTHESIS.md`.

## Foundations already landed (do not re-edit these)
- `shared/tracking.js` + `TRACKING_NOTICE` — use this string in both sector pre-renders
- `SeoPageShell` footnote is now a `<div>`; notice uncapped when `width="wide"`
- CTA copy / SeoRail / broker-aside offer gate — already fixed

## Allowlist ONLY (edit nothing else)
- `src/pages/sectors.tsx`
- `src/pages/sector.tsx`
- `functions/sectors/index.js`
- `functions/sectors/[slug].js`
- `shared/sectors.js` / `shared/sectors.d.ts` only if needed for a shared helper
- Do NOT edit `functions/sitemap.xml.js` — main session owns it

## Must-land
1. Render `indexLeadSentence` as visible prose on `/sectors` (parity with pre-render)
2. Add `TRACKING_NOTICE` (from `shared/tracking.js`) to both sector pre-renders under the standfirst / near where React puts TrackingNotice
3. Fix skeletons: `/sectors` = stat-tiles + ruled-list (mirror biggest-buys); `/sectors/:slug` = don't pass TOP_COMPANIES/RECENT_BUYS caps as row counts — use realistic small counts
4. Distinguish fetch error from empty: set an error state (or `complete`/`error` flag) so outage ≠ "No sector has reached 5…"
5. ~~Sitemap `sectorEntries`~~ — main session owns sitemap; skip
6. Bonus S: `standfirstSize="lede"` on `/sectors`; unknown-slug branch through SeoPageShell like learn does

## Rules
- No commits, no builds, no deploys
- Text parity: if you change shared copy, update matching functions/*
- Insider names stay OUT of sector pre-renders
- Run `npx tsc --noEmit` before finishing
- Final message: per-file summary + deliberate skips
