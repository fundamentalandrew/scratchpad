# Unified Booking → Placement Link — Plan Set

**Goal.** Stand up one central table of record for the **booking → CM360 placement** link,
plus the minimal details its consumers need, fed by a new background job that **syncs from
both** the FileMaker/TSF system (`di_api.ds_fm_bookings_data`) and the asset-builder
**activation** system (`ai_asset_builder_campaign_activation_cm` + `…_variation_cm`). Then
re-point every downstream consumer at the new table and make the existing **manual unlink**
durable.

This plan set is the design surface. Treat it as the review: each stage is bounded, has an
explicit owner/repo, names real files, and ships its coupled artifacts (schema, ORM, tests,
docs) together.

---

## Source material

- `../di_api.ds_fm_bookings_data_data-usage-report.md` — full consumer inventory of the TSF table.
- `../activation-booking-placement-linking.md` — how activation links booking → campaign → placements.

Both were verified against the live code while writing these plans (file paths and SQL quoted
in the stage plans are real, not paraphrased).

---

## Decisions locked with the requester

| # | Decision | Consequence |
|---|---|---|
| 1 | The central table is the **main table of record** for the link and **feeds `di_ca_placements`** the way `ds_fm_bookings_data` does today. | `di_ca_placements` stays; only its *feed* changes (Stage 4). Its readers are untouched at first. |
| 2 | Migration covers **every** consumer, **including legacy `portal-node`**. | A `portal-node` consumer plan is included (Stage 15) despite the "legacy is maintenance-only" rule — see that plan's scoping note. |
| 3 | Physical table lives in the **`di_api`** schema; ORM access is a **model/repo under the existing `fundadata-alphix` `Intell` section** (no new section). | Table: `di_api.di_booking_placement_link`. Repo: `fundadata.intell.bookingPlacementLink`. |

> Names (`di_booking_placement_link`, `bookingPlacementLink`) are proposals consistent with local
> conventions; confirm against DBA naming before the migration lands. They are used verbatim
> throughout so the plans stay concrete.

---

## Architecture in one picture

```
 WRITERS (unchanged, each owns its own source table)
 ┌───────────────────────────┐        ┌──────────────────────────────────────────┐
 │ shepob-filemaker           │        │ asset-builder-service + shepob-doubleclick │
 │  ImportBooking.js          │        │  Activation Manager state machine          │
 │  → di_api.ds_fm_bookings_  │        │  → ai_asset_builder_campaign_activation_cm │
 │     data                   │        │     (+ _variation_cm, cmPlacementId)       │
 └────────────┬───────────────┘        └─────────────────────┬──────────────────────┘
              │  (read incrementally)                         │ (read once cmPlacementId set)
              ▼                                               ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  STAGE 3 — sync inside shepob-filemaker                             │
        │  TSF half chained onto ImportBooking; activation + reconcile as     │
        │  sibling commands — upserts both sources into …                    │
        └───────────────────────────────┬────────────────────────────────────┘
                                         ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  di_api.di_booking_placement_link   ← TABLE OF RECORD (Stage 1)    │
        │  - one row per (source, sourceUuid); pure sync, shepob-write-only  │
        └───────────────┬───────────────────────────────────┬────────────────┘
                        │ Stage 4 (feed)                     │ Stages 10–16 (reads)
                        ▼                                    ▼
        portal_production.di_ca_placements          all analytics / reporting /
        (shepob-intell, re-pointed at central)      troubleshooter / activation consumers
              ▲
              │ anti-joins (excludes unlinked pairs)
        portal_production.di_ca_placement_unlink   ← manual unlink (Stage 5)
        (node-writable; di_api stays shepob-only)
```

The two source tables and their writers **do not change**. The central table is purely derived
from them and is **shepob-write-only** (`di_api`). Manual unlink — a node-API action — therefore
lives in a separate node-writable `portal_*` table and is applied as an overlay at the Stage 4
feed (Stage 5).

---

## Stages

Build order is top-to-bottom; later stages depend on earlier contracts. Stages 10–16 are
independent of each other and can run in parallel once Stage 1–4 are live.

| Stage | File | Repo(s) | Depends on |
|---|---|---|---|
| 1 | `01-central-table-schema.md` | `demo-data` (schema) + migration | — |
| 2 | `02-fundadata-alphix-section.md` | `fundadata-alphix` | 1 |
| 3 | `03-sync-shepob.md` | `shepob-filemaker` (chained onto the booking import) | 1, 2 |
| 4 | `04-di-ca-placements-feed.md` | `shepob-intell` | 1, 3 |
| 5 | `05-unlink-durability.md` | `portal-node` (+ optional `fundadata-alphix`) | 1, 4 |
| 10 | `consumers/10-alphix-app-node.md` | `alphix-app-node` | 2 |
| 11 | `consumers/11-fundadata-orm-consumers.md` | `fundadata-alphix` | 2 |
| 12 | `consumers/12-shepob-doubleclick.md` | `shepob-doubleclick` | 2, 3 |
| 13 | `consumers/13-shepob-troubleshooter.md` | `shepob-troubleshooter` | 2, 3 |
| 14 | `consumers/14-asset-builder-service.md` | `asset-builder-service` | 2, 3 |
| 15 | `consumers/15-portal-node-legacy.md` | `portal-node` | 2 (or raw SQL) |
| 16 | `consumers/16-orm-model-consolidation.md` | `fundadata-alphix` | 2 |

---

## Cross-cutting principles for every stage

- **One writer, many readers; `di_api` is shepob-only.** Only the Stage 3 sync (in
  `shepob-filemaker`) writes `di_booking_placement_link`. Node APIs cannot write `di_api`, so the
  manual unlink lives in the node-writable `portal_production.di_ca_placement_unlink` table.
  Everything else reads.
- **Behaviour-preserving cutover.** Each source table and `di_ca_placements` stays populated
  in parallel until its consumers are migrated and verified. No big-bang.
- **The three invariants the report calls out must survive every migration:**
  1. `placementId ↔ placementUniqueNumber` translation (analytics),
  2. click-tracker handling — via the `isClickTracker` boolean (derived at sync time from
     `tracker_data_selector='Click'`); the `Url.ts` `costStructure='Click Tracker'` check reads
     `costStructure` from `ds_bookings`, not this table,
  3. test-data exclusion ("only data on/after `placementDateStart` counts").
- **Guarded ORM.** The new model gets a real guard (the existing three TSF models are all
  `FundadataGuardPublic` with a TODO — we do not repeat that).
- **Idempotent, incremental, observable sync.** High-water-mark reads, upsert-on-conflict,
  bounded reconcile deletes, `report.success()` / `report.error()` on every path.

## Open questions to resolve before Stage 1 lands

1. Final physical table + section names (see note above).
2. Should activation placements also flow into `di_ca_placements` (Stage 4), or only TSF?
   Recommendation: **yes, both** — that is the whole point of unifying, and the existing
   reconciler already protects non-TSF rows from deletion (`tsfUuid != ''` guard). Stage 4
   makes this explicit.
3. Guard policy: confirm the booking asset is the correct authorization boundary (Stage 2).
