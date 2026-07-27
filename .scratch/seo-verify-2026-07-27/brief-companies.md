# Implementer brief — COMPANIES

Read `companies.md` and `SYNTHESIS.md`.

## Foundations already landed
- `companiesCta(marketId)` already market-aware; companies.tsx already calls it and uses LogoDevAttribution in footnote
- Do not re-edit cta-copy.ts / page-shell / seo-rail

## Allowlist ONLY
- `src/pages/companies.tsx`
- `src/components/company/more-companies.tsx`
- `functions/companies.js`
- `functions/company/[key].js` only if name-cleaner parity needs a shared path (prefer fixing companies.js to loop like `src/lib/company.ts`)
- Do NOT reopen company h1 disagreement on `/company/:key`

## Must-land
1. Sync name cleaner in `functions/companies.js` to the looped version (match `cleanCompanyName` in `src/lib/company.ts` / company/[key].js)
2. On API failure / no data bailout for `/companies` pre-render: follow sectors posture — `noindex` the shell (don't ship static UK homepage title). See `functions/sectors/index.js` for pattern
3. `MoreCompanies`: apply the same content bar (`meetsContentBar` / deals>=2 || analysed>0) used by index + sitemap
4. Improve `/companies` skeleton toward search + grid shape (or at least not a ruled-list lying about layout)
5. Bonus: cards without `total_value` shouldn't duplicate the "N buys" string / suppress bars per-card not group-wide

## Rules
- No commits/builds/deploys
- Do not add company-page eyebrow / reopen h1 split (locked)
- `npx tsc --noEmit` before finish
- Per-file summary + deliberate skips
