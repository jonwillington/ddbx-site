# Implementer brief — REPORTS

Read `reports.md` and `SYNTHESIS.md`.

## Foundations already landed
- `shared/tracking.js` available if you need TRACKING_NOTICE in a pre-render
- CTA reports body already tuned — do not edit cta-copy.ts

## Allowlist ONLY
- `src/pages/reports.tsx`
- `src/pages/report.tsx`
- `src/components/monthly/*` only if money-rounding / SectorTable needs it for the must-lands
- `functions/reports/index.js`
- `functions/reports/[month].js`
- `shared/months.js` if moving CONTENTS there
- Do NOT edit `functions/sitemap.xml.js` — main session owns the US `/reports` gate

## Must-land
1. ~~Sitemap US `/reports` gate~~ — main session owns sitemap; skip
2. De-duplicate the newest month on `/reports` (promoted in lead sheet AND again in the list)
3. Unify money rounding between React `money()` and pre-render `formatGbp` (or shared helper)
4. Fix skeletons to match loaded layouts (index: sheet + list; report: don't lead with wrong variant)
5. Bonus: reserve height for lead figures so CTA doesn't jump

## Rules
- No commits/builds/deploys
- Leave TODO(us-reports) currency hardcodes unless newly broken
- `npx tsc --noEmit` before finish
- Per-file summary + deliberate skips
