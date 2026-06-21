# Director Dealings (ddbx.uk) — website Claude Code context

> **⚠ Production system across three repos.** This site, the API
> (`ddbx-data`), and the iOS app share wire-format types, API endpoint
> contracts, and `MARKET_CONFIG` capability flags. Read
> [`~/CLAUDE.md`](../CLAUDE.md) ("Coordinating changes") **before**
> renaming types, changing API params, or adding filter axes — the
> sibling consumers don't fail loudly and there is no staging.

This repo is the public website. The data platform (Cloudflare Worker, D1,
scraping/triage/analysis pipeline) was split out into the `ddbx-data` repo
on 2026-05-10. If you're looking for `worker/`, it lives there now.

## Sibling repos

Cloned alongside this one in the same parent dir:

- `../ddbx-data/` — backend platform, the canonical source for `Dealing` types
- `../ddbx-ios-app/` — iOS app consuming the same API; useful for
  `investigations/multi-market/` strategy docs and as the reference for
  Performance feature ports (see `src/lib/performance/*`)

See `~/CLAUDE.md` for the system-wide map.

## Editorial house style source

Canonical house-style writing rules are defined in
`../ddbx-data/worker/llm/prompts.ts` as `HOUSE_STYLE_RULES`.

When changing reader-facing copy constraints in this repo, reference that
constant so wording stays aligned with API-generated recaps and analysis copy.
If you need to change the rules themselves, update `ddbx-data` first, then
apply matching wording updates here.

## URLs

| Purpose | URL |
|---|---|
| Frontend (this repo) | https://ddbx.uk |
| Worker / API base (ddbx-data repo) | https://api.ddbx.uk |
| API dealings | https://api.ddbx.uk/api/dealings |

## Stack

- React + Vite + Tailwind v4 + HeroUI v3, deployed to Cloudflare Pages
- Consumes the public API at `https://api.ddbx.uk/api/*` (set `VITE_API_BASE`
  to override in dev/preview)

## Type sharing with `ddbx-data`

The frontend keeps a copy of the canonical `Dealing` types at
`src/types/ddbx.ts`. The canonical version lives in `ddbx-data/worker/db/types.ts`.

```bash
npm run sync:types     # copy ddbx-data/worker/db/types.ts -> src/types/ddbx.ts
npm run check:types    # CI-friendly drift check (exits non-zero if out of sync)
```

Both scripts assume `ddbx-data` is cloned alongside `ddbx-site`. Override with
`DDBX_DATA_PATH=/path/to/ddbx-data`.

**Workflow**: when you change types in `ddbx-data`, run `npm run sync:types`
here in the same change cycle. CI runs `check:types` to catch drift.

## Discretion mode (web gating)

The public website intentionally shows only a sliver of the data so the iOS
app remains the canonical surface. One flag governs every gating surface
(drawer + performance contributors) — flip it and everything follows.

**Toggle precedence** (highest wins):
1. URL: `?discretion=on|off|reset` — `reset` clears the override, the rest stick via localStorage. Lets you flip the live site from any browser without a redeploy.
2. localStorage: `ddbx.discretion.override` (written by the URL param).
3. Env: `VITE_DISCRETION_MODE` in `.env.production` (currently `on`).

Default is `on`, and the production build ships with the env set to `on` —
so the gated teaser is the default experience for every visitor. Set the
env to `off` (or use `?discretion=off` per-browser) to get the full UX.

- **Drawer cap**: the **first** deal opened today shows full analysis; subsequent drawers render dummy text (`src/components/discretion/dummy-analysis.ts`) under a CSS blur with a CTA overlay. Position card and price chart stay unblurred.
- **Performance contributors**: list past the first few names blurs to nudge installs.
- **List cap**: previously capped lists to 3 rows via `BlurredDealingRow`; component is gone and the cap is no longer enforced. `LIST_CAP=3` is still exported for future reuse.
- **Storage**: `localStorage` key `ddbx.discretion.viewState` shaped `{ date: "YYYY-MM-DD", viewedDealIds: string[] }`. Resets at UK midnight (Europe/London).
- **Module**: all logic lives in `src/lib/discretion.ts` (`useDiscretion` hook, `recordView`, `hasFullAccess`, `DISCRETION_ENABLED`).
