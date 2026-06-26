# Deployment runbook — Unified Booking → Placement Link

This runbook deploys the change set that makes `di_api.di_booking_placement_link` the **table of
record** for the booking → CM360 placement link, fed from two sources (TSF/FileMaker + activation),
and re-points `portal_production.di_ca_placements` and every downstream consumer at it.

It is the operational companion to the stage plans (`01`–`05`, `consumers/10`–`16`). Read those for
the *why*; this file is the *how* and *in what order*.

> **Golden rule of this rollout:** the central table is populated and verified **before** anything
> reads from it or before the `di_ca_placements` feed is flipped. Both source tables
> (`ds_fm_bookings_data`) and `di_ca_placements` remain populated in parallel the whole time — there
> is no big-bang and no data decommissioning in this rollout.

---

## Repos in this deployment

| Repo | Change | Branch / commit state at handoff |
|---|---|---|
| `demo-data` | Stage 1 schema-of-record docs | uncommitted working tree |
| `fundadata-alphix` | Stage 2 (`bookingPlacementLink` model/repo/guard), Consumer 11 (reporting), Consumer 16 (guard), version → **3.12.0** | committed on `feature/tsf-campaign-manager` |
| `shepob-filemaker` | Stage 3 sync (TSF chained + `SyncActivationPlacementLink`, `ReconcilePlacementLink`, `BackfillPlacementLinkTsf`, `Helper/PlacementLinkSync`), dep → `^3.12.0` | uncommitted working tree |
| `shepob-intell` | Stage 4 feed re-point (`BookingPlacement.js`) | uncommitted working tree |
| `portal-node` | Stage 5 durable unlink (`Unmatch.js`) + Consumer 15/15b reads (9 sites) | uncommitted working tree |
| `alphix-app-node` | Consumer 10 (`TrafficLink.js` + test), dep → `^3.12.0` | uncommitted working tree |
| `shepob-doubleclick` | Consumer 12 (4 readers), dep → `^3.12.0` | uncommitted working tree |
| `shepob-troubleshooter` | Consumer 13 (`InvalidUrl.js`) | uncommitted working tree |
| `asset-builder-service` | Consumer 14 (tests only — Shape 1 no-op), dep → `^3.12.0` | uncommitted working tree |

Repo root for all of the above: `/Users/andrew/Code/<repo>`.

## Conventions used below

- **[DEPLOY]** — merge & ship code through your normal CI/CD for that repo.
- **[SHEPHERD▶]** — a **manual, one-time** Shepherd/CLI run: `node src/index.js <Command> [param]`.
- **[SHEPHERD⏱]** — a **recurring** Shepherd schedule to register (external cron/Shepherd infra).
- **[VERIFY]** — read-only check; no writes.
- **[GATE]** — a hard stop; do not proceed until its criteria pass.

## Prerequisites (confirm before step 1)

- The two physical tables already exist: `di_api.di_booking_placement_link` and
  `portal_production.di_ca_placement_unlink` (created out of band; this rollout does not run DDL).
- **Collation pre-flight (do this before step 4):** both new tables must be
  `utf8mb4_unicode_ci`, matching the `di_api` source tables. If they were created with only
  `CHARSET=utf8mb4` they will have defaulted to `utf8mb4_general_ci`, and every column-vs-column
  string join in the sync, reconcile, and Stage 4 feed will fail with *"Illegal mix of
  collations"*. Verify and, if needed, remediate:

  ```sql
  -- check
  SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, COLLATION_NAME
  FROM information_schema.COLUMNS
  WHERE COLLATION_NAME IS NOT NULL
    AND ((TABLE_SCHEMA='di_api' AND TABLE_NAME IN
            ('di_booking_placement_link','ds_fm_bookings_data','ds_bookings_related'))
      OR (TABLE_SCHEMA='portal_production' AND TABLE_NAME IN
            ('di_ca_placements','di_ca_placement_unlink')))
    AND COLUMN_NAME IN
      ('uuid','sourceUuid','bookingUniqueNumber','tsfCurrentAccountId','placementUniqueNumber','tsfUuid');

  -- remediate (safe: central is shepob-write-only & unread, unlink is empty)
  ALTER TABLE di_api.di_booking_placement_link
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ALTER TABLE portal_production.di_ca_placement_unlink
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

  Use `utf8mb4_unicode_ci` specifically (not `general_ci`): the Stage 4 DELETE compares against
  `portal_production.di_ca_placements`, which is the legacy `utf8` (mb3) `_unicode_ci` — only the
  `unicode_ci` family stays compatible across that charset gap. (Do **not** ALTER
  `di_ca_placements` itself — large, out of scope. If the cross-charset DELETE comparison still
  errors after the ALTERs, add `COLLATE utf8mb4_unicode_ci` to its operands in
  `shepob-intell/BookingPlacement.js`.)
- You can publish to the private `@fundamentalmedia` npm registry.
- You have a SQL client with read access to `di_api` and `portal_production`, and the ability to
  trigger Shepherd commands and register schedules.
- All 8 uncommitted repos have been committed and pushed to their deploy branches (or do so as the
  first action of each repo's step).

---

## The 20 steps (temporal order)

### 1. [DEPLOY] `demo-data` — schema-of-record docs

- **Why:** keep the schema files in sync with the live tables. Documentation only; **zero runtime
  effect** (the physical tables already exist).
- **Do:** commit `schemas/server1.di_api.ds.schema`, `schemas/server1.portal_production.di.schema`,
  `schemas/manifest.json`; merge & push.
- **Note:** the schema format cannot express non-unique secondary indexes, engine, or charset — the
  live tables already carry those; they are tracked via the DBA migration, not here.
- **Rollback:** revert the commit (no runtime impact either way).

### 2. [DEPLOY] `fundadata-alphix` — merge to main

- **Why:** the library carries the Stage 2 contract every typed consumer needs, plus the Consumer 11
  reporting migration and Consumer 16 guard.
- **Do:** merge `feature/tsf-campaign-manager` → `main`.
- **Verify before merging:** `npx tsc --noEmit` clean and `npx vitest run` green for the new/changed
  specs (`Intell/Repo/BookingPlacementLink.spec.ts`, `Reporting/.../ExcludeCode.spec.ts`,
  `Reporting/Media/Alphix/Url.spec.ts`, `Intell/CampaignManager/Model/Placement.spec.ts`).
  Pre-existing DB-integration specs that need a live local DB table may fail on a clean tree — confirm
  they fail identically without these changes.

### 3. [DEPLOY] `fundadata-alphix` — publish 3.12.0

- **Why:** consumers can only `npm install` the new contract once it is in the registry. **Publishing
  alone changes nothing in production** until a consumer installs it.
- **Do:** from the repo root, `npm run publish-stable` (runs `npm i && npm run build && cd dist &&
  npm publish`). Confirm `dist/package.json` is `3.12.0` and `dist/FundadataAlphix/Intell/Repo/
  BookingPlacementLink.js` exists in the published tarball.
- **Verify:** `npm view @fundamentalmedia/fundadata-alphix version` reports `3.12.0`.
- **Note:** the version was hand-bumped, so **no git tag** was created — create/push a `v3.12.0` tag
  here if your release process expects one.
- **Rollback:** none needed; an unconsumed published version is inert. If pulled, deprecate rather
  than unpublish.

### 4. [DEPLOY] `shepob-filemaker` — the writer

- **Why:** this repo is the **only writer** of the central table. Deploying it (with 3.12.0) enables
  the activation sync and the backfill command, and chains the incremental TSF sync onto
  `ImportBooking`.
- **Do:** commit the Stage 3 changes (incl. the new `BackfillPlacementLinkTsf.js`), merge,
  `npm install` (pulls `fundadata-alphix@3.12.0`), deploy.
- **Verify before deploy:** `node --test src/` green (helper + reconcile tests); `node --check` on
  all four new/edited command/helper files.
- **Note:** deploying does not by itself populate history — the chained TSF sync is incremental and
  the activation schedule is not registered yet. Backfill is steps 5–6.

### 5. [SHEPHERD▶] Activation backfill (one-time)

- **Command:** `node src/index.js SyncActivationPlacementLink`
- **Why:** first run with an empty `source='activation'` high-water mark defaults to `1999-09-09`, so
  it fully backfills every completed activation placement (`stage='DONE'`, `status='COMPLETED'`,
  `cmPlacementId IS NOT NULL`).
- **Idempotent:** safe to re-run.

### 6. [SHEPHERD▶] TSF backfill (one-time)

- **Command:** `node src/index.js BackfillPlacementLinkTsf`
- **Why:** `ImportBooking` is incremental and has **no full-reseed mode**, so a normal import will not
  populate TSF history. This command calls the same idempotent `syncTsf` from `1999-09-09`, rebuilding
  the TSF side wholesale.
- **Bounded variant:** `node src/index.js BackfillPlacementLinkTsf 2024-01-01` to re-backfill only a
  window.
- **Idempotent:** `INSERT … ON DUPLICATE KEY UPDATE` on `(source, sourceUuid)`, no human-owned
  columns. Safe to re-run. **Do not** put this on a recurring schedule.

### 7. [VERIFY] Central-table reconciliation

Run (read-only):

```sql
-- TSF: one central row per ds_fm_bookings_data uuid
SELECT
  (SELECT COUNT(*)          FROM di_api.di_booking_placement_link WHERE source='tsf') AS central_tsf,
  (SELECT COUNT(DISTINCT uuid) FROM di_api.ds_fm_bookings_data)                       AS source_tsf;
-- expect central_tsf = source_tsf

-- Activation: one central row per completed, placed variation
SELECT
  (SELECT COUNT(*) FROM di_api.di_booking_placement_link WHERE source='activation') AS central_act,
  (SELECT COUNT(*) FROM portal_production.ai_asset_builder_campaign_activation_variation_cm
     WHERE stage='DONE' AND status='COMPLETED' AND cmPlacementId IS NOT NULL)        AS source_act;
-- expect central_act = source_act

-- isClickTracker correctness
SELECT COUNT(*) AS bad_activation_flags
  FROM di_api.di_booking_placement_link
  WHERE source='activation' AND isClickTracker <> 0;                 -- expect 0

SELECT COUNT(*) AS bad_tsf_flags
  FROM di_api.di_booking_placement_link l
  JOIN di_api.ds_fm_bookings_data s ON l.sourceUuid = s.uuid
  WHERE l.source='tsf'
    AND l.isClickTracker <> (s.tracker_data_selector = 'Click');     -- expect 0
```

### 8. [GATE] Backfill complete & verified

All four checks in step 7 pass. **Nothing downstream may launch until this gate passes** —
specifically `portal-node` (step 11, it reads the central table), the feed flip (steps 12–15), and
the readers (step 18). If counts disagree, investigate the sync before continuing; re-running steps
5–6 is safe.

### 9. [SHEPHERD⏱] Register recurring schedule — `SyncActivationPlacementLink`

- **Command the schedule runs:** `node src/index.js SyncActivationPlacementLink`
- **Cadence:** frequent — it gates how fresh activation placements are in the feed. Schedule it at
  least as often as the `shepob-intell` `BookingPlacement` feed.

### 10. [SHEPHERD⏱] Register recurring schedule — `ReconcilePlacementLink`

- **Command the schedule runs:** `node src/index.js ReconcilePlacementLink`
- **Cadence:** periodic / lighter (orphan cleanup only).
- **Not scheduled:** the TSF sync (chained to `ImportBooking`) and `BackfillPlacementLinkTsf`
  (one-time only).

## HOLD
At this point you can hold and check everything is working ok datawise, beyond this point we are deploying breaking changes.



### 12. [DEPLOY] `shepob-intell` — shadow / diff mode

- **Why:** prove the central-sourced feed produces the same `di_ca_placements` for TSF rows (parity)
  and only adds activation rows, before flipping live.
- **Do:** deploy `BookingPlacement.js` behind a shadow flag (`report.param(0)==='central'`) or run the
  intended INSERT/DELETE statements in a read-only diff harness against current `di_ca_placements`.
- **Diff to compute** — the central-derived "want" set vs the live table:

```sql
-- would-be rows from central (the new builder's INSERT targets)
SELECT l.placementId, l.sourceUuid AS tsfUuid, dbr.bookingUniqueNumber
  FROM di_api.di_booking_placement_link l
  JOIN di_api.ds_bookings_related dbr ON l.tsfCurrentAccountId = dbr.uuid
  LEFT JOIN portal_production.di_ca_placement_unlink u
    ON u.placementId = l.placementId AND u.bookingUniqueNumber = dbr.bookingUniqueNumber
  WHERE l.source='tsf' AND l.placementId IS NOT NULL AND u.id IS NULL
UNION
SELECT l.placementId, '' AS tsfUuid, l.bookingUniqueNumber
  FROM di_api.di_booking_placement_link l
  LEFT JOIN portal_production.di_ca_placement_unlink u
    ON u.placementId = l.placementId AND u.bookingUniqueNumber = l.bookingUniqueNumber
  WHERE l.source='activation' AND l.placementId IS NOT NULL AND u.id IS NULL;
```

Compare that set to `SELECT placementId, tsfUuid, bookingUniqueNumber FROM portal_production.di_ca_placements`.

### 13. [VERIFY] Shadow-diff results

- **TSF rows:** symmetric difference is **empty** (would-insert minus existing = ∅ and would-delete = ∅).
- **Activation rows:** **additive only** (present in "want", absent from current `di_ca_placements`).
- **DELETE set:** every row the new reconciler would delete has genuinely no backing (non-unlinked)
  central link — no surprise rows from another writer. Pay attention to existing `tsfUuid=''` rows
  that are *not* activation-backed.

### 14. [GATE] Shadow diff clean

Step 13 passes for TSF (empty) and activation (additive only), and the DELETE set is understood.
Any non-empty TSF diff is a semantic mismatch — stop and investigate before flipping.

### 15. [DEPLOY] `shepob-intell` — flip live

- **Do:** deploy `BookingPlacement.js` with the central-sourced statements as the live path (remove
  the shadow flag if used). The old SQL stays in a trailing comment for one release.
- **Effect:** `di_ca_placements` is now projected from `di_api.di_booking_placement_link`, with the
  unlink overlay and the activation rows included.
- **Rollback:** revert to the commented old SQL block and redeploy. No data to unwind (both sources
  ran in parallel); the only durable new state is `di_ca_placement_unlink` rows, which the old
  builder ignores (reverting reintroduces the original resurrection bug but loses no data).

### 16. [SHEPHERD▶] Post-flip verification run (one-time)

- **Command:** `node src/index.js BookingPlacement` (in `shepob-intell`)
- **Why:** force one immediate run so verification (step 17) reflects the new builder. Its recurring
  schedule already exists and continues unchanged.

### 17. [VERIFY] Feed correctness + unlink regression

- **TSF parity:** `di_ca_placements` row count for `tsfUuid <> ''` rows matches the pre-cutover count.
- **Activation present:** rows for activation placements now appear (previously absent) —

```sql
SELECT COUNT(*) FROM portal_production.di_ca_placements WHERE tsfUuid = '';  -- now > 0
```

- **Unlink regression (the original bug):**
  1. Unlink a booking↔placement pair via the `Unmatch` route → confirm a row in
     `portal_production.di_ca_placement_unlink`.
  2. Run `node src/index.js BookingPlacement` → the `di_ca_placements` row is gone.
  3. Re-run the booking import (`node src/index.js ImportBooking`, or `BackfillPlacementLinkTsf`) →
     central re-synced, the unlink row **untouched**.
  4. Run `BookingPlacement` again → the row is **not** resurrected. ✅
- **Enrichment survival:** confirm `shepob-doubleclick/Report.js`'s `placementRatio`/cost columns are
  still present for surviving rows, and are recomputed (not lost) after any delete+reinsert cycle.

### 11. [DEPLOY] `portal-node` — durable unlink + legacy reads

- **Why:** ships Stage 5 (`Unmatch.js` now writes a durable row to
  `portal_production.di_ca_placement_unlink`) **and** Consumer 15/15b — 9 legacy read sites now read
  the central table.
- **Depends on the step 8 gate:** the Consumer 15 reads (analytics translation, GCM click-tracker,
  start-date, Tag/Reporting) would return **incomplete data** if the central table is not fully
  backfilled. This is why portal-node cannot launch before backfill completes.
- **Why before the feed flip:** deploying the durable-unlink write now means any unlink performed
  around cutover is already recorded when the new feed (step 15) begins honoring it.
- **Do:** commit (incl. the `CLAUDE.md` note), merge, deploy. Legacy raw-SQL only — no fundadata, no
  install change.
- **Verify:** `node --check` on all edited files; `grep -rn ds_fm_bookings_data src/ --exclude-dir=node_modules`
  returns nothing.
- **Federated-query caveat:** `src/Lookup/Tag/Reporting.js` reads through the BigQuery
  `EXTERNAL_QUERY("…central_di_api")` connection, not portal-node's MySQL pool. Confirm that
  connection's MySQL user can `SELECT di_api.di_booking_placement_link` (same schema as the old
  table, so it should) before relying on that report.

### 18. [DEPLOY] Read consumers — parallel, any order

All safe now (central populated at step 8, `di_ca_placements` reflects it at step 15).

- **`shepob-doubleclick`** — commit, `npm install` (3.12.0), deploy. Consumer 12 raw-SQL readers
  (`Report.js`, `BookingUpdated.js`, `PopulateModifiedPlacementCreativeDateUrl.js`,
  `PlacementCreativeDateUrl.js`). No new Shepherd commands.
- **`shepob-troubleshooter`** — commit, deploy. Consumer 13 (`InvalidUrl.js`). No fundadata
  dependency; raw SQL only.
- **`alphix-app-node`** — commit, `npm install` (3.12.0), deploy. Consumer 10 (`TrafficLink.js`)
  **and** Consumer 11 reporting, which activates via the library upgrade (`ExcludeCode`, `Url` now
  read the central table). *(Known pre-existing issue: the repo's `test` script is broken on Node 22 —
  use `node --test "dist/**/*.test.js"`.)*
- **`asset-builder-service`** — commit, `npm install` (3.12.0), deploy. Consumer 14 had no production
  code change (Shape 1); it benefits from activation placements now flowing into `di_ca_placements`.

### 19. [VERIFY] Reader spot-checks

- Diff each migrated reader's output against pre-cutover behaviour on a fixture/known input: analytics
  name/id resolution (`TrafficLink`), click-tracker impression/cost sums, exclude-code 5 values,
  per-placement start-date gates.
- Re-confirm the `Tag/Reporting.js` federated `EXTERNAL_QUERY` against `di_api.di_booking_placement_link`
  returns rows.
- **Behaviour expansions to confirm with owners** (all intended): activation placements now
  participate in reporting exclude-code/click-tracker and in cost reprocessing (which now also
  triggers on activation `updatedAt` changes); the `MIN(placementDateStart)`-per-placement
  earliest-window choice used in the multi-row collapses.

### 20. [CLEANUP] After one release

- Remove the commented-out old SQL block in `shepob-intell/src/Command/BookingPlacement.js`.
- No table decommissioning in this rollout — `ds_fm_bookings_data` and `di_ca_placements` remain
  populated in parallel. Retiring `ds_fm_bookings_data` reads entirely (and any model cleanup beyond
  Consumer 16) is future work, gated on this rollout proving stable.

---

## Quick reference — manual Shepherd actions

| Step | Type | Command / action |
|---|---|---|
| 5 | one-time | `node src/index.js SyncActivationPlacementLink` (shepob-filemaker) |
| 6 | one-time | `node src/index.js BackfillPlacementLinkTsf` (shepob-filemaker) |
| 9 | schedule | register recurring `SyncActivationPlacementLink` — frequent |
| 10 | schedule | register recurring `ReconcilePlacementLink` — periodic |
| 16 | one-time | `node src/index.js BookingPlacement` (shepob-intell) |

## Hard gates

- **Step 8** — backfill verified — before portal-node, the feed flip, or any reader.
- **Step 14** — shadow diff clean — before flipping the `di_ca_placements` feed live.
