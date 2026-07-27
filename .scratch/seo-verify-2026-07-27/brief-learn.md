# Implementer brief — LEARN

Read `learn.md` and `SYNTHESIS.md`.

## Foundations already landed
- CTA copy for learn already de-rhymed in `cta-copy.ts` — do not re-edit it
- SeoRail market-home prefix fix landed — still fix learn's marketId selection

## Allowlist ONLY
- `src/pages/learn.tsx`
- `functions/learn/index.js` / `functions/learn/[slug].js` only if parity requires
- `shared/glossary.js` / `.d.ts` only if needed

## Must-land
1. **Rail market from host, not entry owner.** All three `SeoRail` call sites: use host market (`marketForPath` / hostname), NOT `ownerForHost` / `entry.owner`. Live examples still follow `entry.owner` (that claim held — keep it).
2. Filter UK `liveData: "recent"` examples through `isEligibleBuy` (or equivalent buy filter) so "Recent PDMR purchases" cannot show sells / scheme awards
3. Sort live examples by the date the row displays (`disclosed_date`), or display the date you sort by — use existing `compareDealingsNewestFirst` if appropriate

## Rules
- No commits/builds/deploys
- Do not break jurisdiction of live examples (entry.owner)
- `npx tsc --noEmit` before finish
- Per-file summary + deliberate skips
