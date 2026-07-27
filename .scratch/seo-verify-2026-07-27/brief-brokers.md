# Implementer brief — BROKERS

Read `brokers.md` and `SYNTHESIS.md`.

## Foundations already landed
- `broker-aside.tsx` "All platforms" list now gates on `isOfferLive(b)` — verify, don't redo
- Guide pages now pass `footnote={<BrokerComplianceNote />}` through the shell — verify
- Do not edit seo-rail / page-shell / cta-copy

## Allowlist ONLY
- `src/pages/broker-category.tsx`
- `src/pages/broker-comparison.tsx`
- `src/pages/broker-detail.tsx`
- `src/pages/compare.tsx`
- `src/components/brokers/broker-page-ui.tsx` if needed for skeleton / RelatedCards
- `functions/brokers/best-for/[category].js` / `functions/brokers/compare/[pair].js` only for parity
- Do NOT build a full broker-detail pre-render Function this round (defer)
- Do NOT migrate `/brokers` or `/brokers/:slug` onto SeoPageShell this round (defer — note as skip)

## Must-land
1. Pass `hideMobileCta` on guide routes (category + comparison) like broker-detail — stop pinned app trial bar competing with Visit CTAs on mobile
2. Fix orphan "Guides these two appear in" heading when empty
3. Fix BreadcrumbList string vs visible crumb if still wrong
4. Tighten `/brokers` (compare.tsx) skeleton phantom-card mismatch if S
5. Replace bare link list on broker-detail with RelatedCards if still present and S

## Rules
- FCA/ASA locked — no new "best" claims
- No commits/builds/deploys
- `npx tsc --noEmit` before finish
- Per-file summary + deliberate skips (especially shell migration deferrals)
