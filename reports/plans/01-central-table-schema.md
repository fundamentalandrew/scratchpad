# Stage 1 — Central table schema: `di_api.di_booking_placement_link`

**Owner artifacts:** schema definition in `demo-data/schemas/server1.di_api.ds.schema`
(alongside `ds_fm_bookings_data`), plus a forward migration for each environment.

**Goal:** one row of record per *source link* — a (booking, CM360 placement) pair as a single
source system sees it — carrying **only** the columns that have a real downstream consumer,
plus sync/identity columns. The central table is **pure sync-from-sources** and lives in
`di_api`, which **only shepobs may write**. Manual-unlink state (a user action that originates in
a node API) therefore lives in a **separate `portal_*` table**, not here — see §"Unlink table".

---

## Design rationale (why these columns and no others)

The TSF usage report (§7) classifies every column of `ds_fm_bookings_data` by who reads it.
Sixteen columns are **written-only** (impressions, bookedQuantity, bookedTotalCost,
traffickingString, product, managementStyle, assetClass, placementSize, pricingType,
tsfCampaignsId, placement_name_short, placementDateEnd*, createdHost, created_at, updated_at).
None of them is read by any analyzed query, so **none is copied** into the central table.
(*`placementDateEnd` is kept — see below — because the activation side needs an end date and
it is cheap; flag for removal if confirmed unused.)

Every column below maps to a named consumer use case. The mapping is in the table.

### Grain

**One row per `(source, sourceUuid)`** — i.e. one row per TSF placement-booking record, and
one row per activation *variation* (a CM360 placement). This is the link "as the source sees
it." The 1→N fan-out to *related* bookings (parent/credited) that `di_ca_placements` performs
is **not** done here — it stays in the Stage 4 feed via `ds_bookings_related`, so the central
table is minimal and `di_ca_placements` semantics are preserved exactly.

---

## DDL

```sql
CREATE TABLE di_api.di_booking_placement_link (
  id                   INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  uuid                 VARCHAR(36)       NOT NULL,            -- our row identity (generated)

  -- provenance / idempotent upsert key ---------------------------------------
  source               VARCHAR(20)       NOT NULL,            -- 'tsf' | 'activation'
  sourceUuid           VARCHAR(255)      NOT NULL,            -- ds_fm_bookings_data.uuid | activation_variation_cm.uuid

  -- the link -----------------------------------------------------------------
  bookingUniqueNumber  VARCHAR(50)       NOT NULL,            -- → ds_bookings
  placementId          BIGINT UNSIGNED   NULL,                -- CM360 placement id (canonical join key)

  -- analytics translation (TSF only) -----------------------------------------
  placementUniqueNumber VARCHAR(255)     NULL,                -- FileMaker record id; NULL for activation

  -- di_ca_placements feed helper (TSF only) ----------------------------------
  tsfCurrentAccountId  VARCHAR(255)      NULL,                -- drives ds_bookings_related fan-out; NULL for activation

  -- classification (click-tracker handling) — boolean, not a raw string ------
  isClickTracker       TINYINT(1)        NOT NULL DEFAULT 0,  -- TSF tracker_data_selector = 'Click'

  -- dates (test-data exclusion: "only start date matters") -------------------
  placementDateStart   DATE              NULL,
  placementDateEnd     DATE              NULL,

  -- CM context (booking↔campaign resolution, joins) --------------------------
  campaignId           BIGINT UNSIGNED   NULL,                -- TSF campaignId | activation cmCampaignId
  advertiserId         BIGINT UNSIGNED   NULL,                -- activation cmAdvertiserId; NULL for TSF
  siteId               VARCHAR(50)       NULL,                -- activation siteId; NULL for TSF

  -- sync metadata ------------------------------------------------------------
  sourceModifiedAt     DATETIME          NULL,                -- TSF modifiedHost | activation updatedAt (high-water mark)
  syncedAt             DATETIME          NULL,                -- last time the sync job touched this row
  created_at           TIMESTAMP         NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP         NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_source_row (source, sourceUuid),             -- sync upsert key
  KEY ix_placement (placementId),
  KEY ix_booking (bookingUniqueNumber),
  KEY ix_placement_unique (placementUniqueNumber),
  KEY ix_source_modified (source, sourceModifiedAt)          -- high-water mark per source
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- COLLATE is REQUIRED, not optional: the di_api source tables (ds_fm_bookings_data,
-- ds_bookings_related) are utf8mb4_unicode_ci. Omitting COLLATE lets the table take the
-- server default (utf8mb4_general_ci), which makes every column-vs-column join in the sync,
-- reconcile, and Stage 4 feed fail with "Illegal mix of collations". unicode_ci (not
-- general_ci) is specifically required so the Stage 4 DELETE also stays compatible with
-- portal_production.di_ca_placements, which is utf8 (mb3) _unicode_ci.
```

### Why one boolean (and not `costStructure`) — verified against the code

`tracker_data_selector` is **only ever compared to `'Click'`** (6 `WHERE` clauses across
`shepob-doubleclick` + `portal-node` GCM traffic) and is **never selected/returned as a string**
— so the single `isClickTracker` boolean is a lossless replacement for it. Activation rows set it
to `0`.

`costStructure` is **not** carried here at all. It is a **booking** attribute that lives in
`ds_bookings` (and is multi-valued — `'CPM'`/`'CPV'`/`'Click Tracker'`/… — and `GROUP_CONCAT`-ed
back to clients elsewhere), so duplicating it onto this placement-link table would be wrong. The
one consumer that needs `costStructure='Click Tracker'` (`Reporting/Media/Alphix/Url.ts`'s
multi-window date logic) reads it **directly from `ds_bookings`** by joining on
`bookingUniqueNumber` — see Consumer 11. There is therefore no `isClickTrackerCost` column.

---

## Unlink table (`portal_*`, node-writable)

`di_api` is shepob-write-only, so the manual unlink — which a user triggers through a node API —
cannot be recorded on the central table. It lives in a small `portal_production` table the node
APIs may write directly (the same schema today's `Unmatch.js` already deletes from), and the
Stage 4 `di_ca_placements` feed applies it as an overlay.

```sql
CREATE TABLE portal_production.di_ca_placement_unlink (
  id                   INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  bookingUniqueNumber  VARCHAR(50)       NOT NULL,            -- matches di_ca_placements grain
  placementId          BIGINT UNSIGNED   NOT NULL,
  unlinkedBy           INT               NULL,                -- userId who unlinked
  created_at           DATETIME          NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pair (placementId, bookingUniqueNumber)       -- one unlink per di_ca pair
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- COLLATE REQUIRED (see central-table note above): bookingUniqueNumber is anti-joined against
-- di_api.ds_bookings_related (utf8mb4_unicode_ci) at the Stage 4 feed, so this table must be
-- utf8mb4_unicode_ci too — not the server-default general_ci.
```

- Grain is `(placementId, bookingUniqueNumber)` — identical to the `di_ca_placements` unique key
  and to the `(bookingUniqueNumber, placementId)` body of today's `Unmatch.js` route.
- **Write path:** node APIs (Stage 5) `INSERT` to unlink, `DELETE` to re-link. This table is in
  `portal_production`, which node already writes (it deletes `di_ca_placements` today).
- **Read path:** the Stage 4 feed (a shepob, in `shepob-intell`) `LEFT JOIN`s / `NOT EXISTS`-es
  this table to exclude unlinked pairs from `di_ca_placements` and delete any that slipped in.
- Unlink only ever affected the booking↔placement bridge (`di_ca_placements`); it does **not**
  touch placement attributes (start date, click-tracker, unique number), so central-table direct
  readers (Stages 10–15) do **not** consult it — only the di_ca feed does. This matches today's
  scope exactly.

---

## Column → consumer use-case map

| Column | Source(s) | Serves (report ref) |
|---|---|---|
| `source`, `sourceUuid` | both | sync idempotency / provenance / back-reference |
| `bookingUniqueNumber` | TSF `bookingUniqueNumber`; activation parent `bookingUniqueNumber` | cost reprocessing (§4 BookingUpdated), di_ca feed, booking↔campaign resolution |
| `placementId` | TSF `placementId`; activation `cmPlacementId` | **the** join key — every reader (§7) |
| `placementUniqueNumber` | TSF `placementUniqueNumber` | analytics translation, URL CA-tag validation (§5) |
| `tsfCurrentAccountId` | TSF | di_ca_placements `ds_bookings_related` fan-out (§4 BookingPlacement) |
| `isClickTracker` | TSF `tracker_data_selector='Click'` | click-tracker metric correction (§5, §6) |
| `placementDateStart` | TSF; activation `placementStart` | test-data exclusion (§5, §6) |
| `placementDateEnd` | TSF; activation `placementEnd` | general window; activation forwarding |
| `campaignId` | TSF `campaignId`; activation `cmCampaignId` | booking↔campaign resolution (BookingCampaignLink) |
| `advertiserId` | activation `cmAdvertiserId` | booking↔campaign resolution |
| `siteId` | activation `siteId` | site-link reconciliation (optional, Stage 3) |
| `sourceModifiedAt` | TSF `modifiedHost`; activation `updatedAt` | change detection (§4), modified-placement detection (§4) |

(Manual unlink is **not** a column here — it lives in `portal_production.di_ca_placement_unlink`,
see above.)

Columns deliberately **excluded** (write-only in TSF, no reader): `impressions`,
`bookedQuantity`, `bookedTotalCost`, `traffickingString`, `pricingType`, `product`,
`managementStyle`, `assetClass`, `placementSize`, `tsfCampaignsId`, `placement_name_short`.
If a future consumer needs one, add it then — do not pre-populate dead columns.

---

## Invariants & edge cases

- **The central table is shepob-write-only and carries no human-owned state.** All columns are
  derived from the two source systems by the Stage 3 sync. Manual unlink is held separately in
  `portal_production.di_ca_placement_unlink` and applied only at the Stage 4 feed — so a re-sync
  can never resurrect an unlink (fixing the known `portal-node` resurrection bug) without the
  sync needing to "protect" any column.
- **`placementId` nullable but indexed.** Activation rows are only emitted once `cmPlacementId`
  exists (Stage 3), so in practice activation rows always have it; TSF rows may carry `0`/NULL
  for un-trafficked placements. Readers already filter `placementId > 0` where needed.
- **Uniqueness is `(source, sourceUuid)`, not `placementId`.** Two sources can legitimately
  describe the same `placementId` (a placement created by activation and later re-imported by
  TSF). The Stage 4 feed de-dupes onto `di_ca_placements`'s own `(placementId,
  bookingUniqueNumber)` unique key, so double-representation in the central table is safe.
- **Charset *and collation*:** the table must be `utf8mb4 COLLATE utf8mb4_unicode_ci` to match the
  `di_api` source tables (`ds_fm_bookings_data`, `ds_bookings_related` are `utf8mb4_unicode_ci`).
  Specifying only `CHARSET=utf8mb4` lets it default to `utf8mb4_general_ci`, and every
  column-vs-column string join (sync, reconcile, Stage 4 feed, consumer joins) then fails with
  *"Illegal mix of collations"*. `unicode_ci` (not `general_ci`) is required so the Stage 4 DELETE
  stays compatible with `portal_production.di_ca_placements`, which is the legacy `utf8` (mb3)
  `_unicode_ci`. If the physical table was already created without the collation, fix it in place:
  `ALTER TABLE di_api.di_booking_placement_link CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  (same for `portal_production.di_ca_placement_unlink`).

## Migration & rollout

1. Add both `CREATE TABLE`s to the schema-of-record files: the `di_api` central table to
   `demo-data/schemas/server1.di_api.ds.schema`, and the `portal_production` unlink table to the
   matching `portal_production` schema file (alongside `di_ca_placements`).
2. Apply the forward migration to each environment via the established migration path (the
   same path used for prior `di_api` tables — confirm with the DBA; this repo set does not use
   an in-app migration runner).
3. The table starts **empty**; Stage 3's first full run backfills it from both sources. No
   data migration is needed because both source tables remain authoritative.

## Verification

- `SHOW CREATE TABLE` matches the DDL; all indexes present.
- After Stage 3 backfill: `COUNT(*) WHERE source='tsf'` reconciles against
  `COUNT(DISTINCT uuid) FROM di_api.ds_fm_bookings_data`; `COUNT(*) WHERE source='activation'`
  reconciles against completed variations with `cmPlacementId IS NOT NULL`.
- `isClickTracker` is `0` for all `source='activation'` rows, and matches
  `tracker_data_selector='Click'` for TSF rows. (No `costStructure` here — it stays in `ds_bookings`.)
- `portal_production.di_ca_placement_unlink` is empty until Stage 5 is exercised.
