# SEO verify round — integration notes (2026-07-27)

## Verification
- `npx tsc --noEmit` — clean
- `npm run build` — clean (pre-existing CSS `:is()` minify warnings only)
- `node --check` on all touched Functions + shared modules — clean
- eslint on touched pages — 0 errors (jsx-sort-props fixed on broker-category)

## Reverted as out of scope
- `src/components/api/accumulation-chart.tsx` — unrelated dirty tree from another session

## Not committed
- `.scratch/seo-verify-2026-07-27/` — local review/briefs/synthesis only

## Deferred (documented in SYNTHESIS.md)
- Full SeoPageShell migration of `/brokers`, `/brokers/:slug`, `/directors/:id`
- Broker-detail pre-render Function
- Company h1 disagreement / company-page eyebrow
- SectorTable StyleSplit redesign
- ranked-board skeleton spacer in shared skeletons.tsx
