# SEO verify round — synthesis (2026-07-27)

Seven reviewers (sectors, leaderboard, learn, reports, companies, brokers, shell).
Themes below require ≥3 independent mentions, or a single high-severity compliance/correctness bug.

## What held

- SeoPageShell ordering + loading suppression on the migrated families
- Family eyebrows where adopted
- Terminal AppCtaBand (not mid-page) with de-converged family bodies (partial: closers still rhyme)
- RelatedCards adoption on guides / sectors / learn / reports archive
- Leaderboard "now worth" disclosure-close baseline (math held; methodology overstates)
- Learn live examples follow entry jurisdiction
- BrokerDisclosure unconditional on affiliate surfaces; ASA category intros rewritten
- Index pre-renders for /sectors, /learn, /reports on middleware skip list
- Report AI-assistance byline; empty US archive noindex (page side)

## Cross-family themes (≥3)

### 1. Skeleton ≠ loaded layout
Sectors, reports, companies, shell (and brokers hub/detail). Real `SeoSkeleton` variants, wrong shape/row counts. Index pages often omit the opening sheet/tiles the loaded page leads with.

### 2. API failure reads as "nothing here"
Sectors + leaderboard (both catch → `[]` and leave completeness defaults). Pre-render side can also noindex an indexed URL on a blip (leaderboard).

### 3. Sitemap contradicts page posture
- Sectors: single capped 1000-row rollup while pages page through
- Reports: `/reports` hardcoded into ddbx.us sitemap while pre-render noindexes empty US archive
- Leaderboard: `archiveYears` can advertise a Jan-1 current-year board the pre-render noindexes
Comment at `sitemap.xml.js:294` states the rule being broken.

### 4. Rail market / offer bugs
- Learn entry rail follows `entry.owner`, not host → UK brokers on ddbx.us for UK-owned entries; on ddbx.eu every `/learn*` gets UK affiliates (shell #1)
- Broker aside gates offers on `offer_headline` not `isOfferLive()` — expired ASA offers across every UK SEO rail
- SeoRail: hex tokens, BUTTON_FILLED reimplementation, `/us/directors/:id` drops market-home link

### 5. Parity leftovers (softer, still real)
- `/sectors` `indexLeadSentence` crawler-only (exact defect last round fixed one level down)
- Sector pre-renders omit TrackingNotice / tracking-since caveat
- Companies hub name-cleaner one-pass vs loop (crawler sees dirty names)
- Reports: money rounding / h1 / duplicated newest month across boundary

### 6. Shell footnote incomplete
- Leaderboard: only family with no footnote at all (past-performance figures)
- Footnote is a `<p>` — companies + both broker guides work around it with hand-rolled blocks
- Company page still has no family eyebrow (open decision on h1 left locked)

### 7. Off-shell holdouts
`/brokers`, `/brokers/:slug`, `/directors/:id` (and company detail) never migrated. Guides are fine. Full migration of hub/detail/director is M — defer unless foundations make it cheap; prefer surgical fixes this round.

## Must-land this round

### Foundations (serial, shared files)
1. `SeoPageShell` footnote → block element; widen notice on `width="wide"`
2. Lift TrackingNotice label / copy into `shared/` where needed; sector pre-renders get the caveat
3. `SeoRail` / `broker-aside`: `isOfferLive()`, host-safe links, market-home prefix fix, tokenise filled button
4. `companiesCta` market-aware (director vs insider); light CTA closer de-rhyme if cheap
5. Reports `CONTENTS` → `shared/` if touching reports parity

### Per family (disjoint implementers)
| Family | Must-land |
|---|---|
| Sectors | Render `indexLeadSentence`; tracking in both pre-renders; skeletons; distinguish fetch error; sitemap `fetchDealingsWindow` |
| Leaderboard | Shell footnote; fetch-error vs empty; methodology disclosure clause; median sample size; RelatedCards relocate |
| Learn | Rail from host (`marketForPath`), not entry owner; filter UK `liveData:"recent"` to buys; sort examples by disclosed_date |
| Reports | Sitemap gate US `/reports`; de-dupe lead month; unify money rounding; skeletons match |
| Companies | Sync name cleaner in `functions/companies.js`; API-fail → noindex head; MoreCompanies content bar; skeleton; market CTA |
| Brokers | `isOfferLive` (foundations); `hideMobileCta` on guides; orphan heading / breadcrumb string if S |

### Deliberately defer
- Full SeoPageShell migration of `/brokers`, `/brokers/:slug`, `/directors/:id`, company detail eyebrow
- Broker detail pre-render Function (M/L)
- SectorTable StyleSplit redesign (reports M)
- Reopening company h1 disagreement

## Effort posture
Prefer S fixes that close correctness/compliance/parity. Foundations first, then six parallel implementers with disjoint allowlists, then integration (tsc + build + node --check).
