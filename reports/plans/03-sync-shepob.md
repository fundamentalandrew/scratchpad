# Stage 3 — Sync into the central table (inside `shepob-filemaker`)

**Repo:** `shepob-filemaker` (no new shepob).
**Goal:** keep `di_api.di_booking_placement_link` in sync with both source systems —
incrementally, idempotently, observably. The **TSF half runs as part of the existing booking
import**, right after the new FileMaker booking data lands.

This shepob is the **only writer** of the central table (it is in `di_api`, which only shepobs
may write). The table holds **no human-owned state** — manual unlink lives in a `portal_*` table
written by the node APIs (Stage 5) and is applied only at the Stage 4 feed, so the sync has
nothing to "protect" and simply upserts.

---

## Where the work goes

`shepob-filemaker` already owns the FileMaker booking pull and already chains a derived write
onto it:

- `src/Command/ImportBooking.js` fetches FileMaker booking data (high-water mark on
  `modifiedHost`), upserts `di_api.ds_fm_bookings_data` (`sql.insertUpdate(...)`, ~`:191`), then
  **immediately** runs a derived `INSERT IGNORE INTO dc_sites_link_ds_bookings … SELECT …`
  (~`:196-202`).

The TSF → central sync slots in as **the next derived step in that same command**, reusing the
`latestDate` high-water value `ImportBooking.js` already computed — so it covers exactly the
rows just imported. The activation → central sync and the orphan reconcile are **sibling
commands in the same repo** (they are not part of the FileMaker pull, so they schedule
independently).

```
shepob-filemaker/
  src/Command/ImportBooking.js              # EXISTING — append the TSF→central derived write (below)
  src/Command/SyncActivationPlacementLink.js  # NEW — activation → central
  src/Command/ReconcilePlacementLink.js       # NEW — orphan deletes (both sources)
  src/Command/BackfillPlacementLinkTsf.js     # NEW — one-time/on-demand full TSF backfill (calls syncTsf)
  src/Helper/PlacementLinkSync.js             # NEW — shared mapper/SQL, called by ImportBooking + tests
  src/Helper/Latest.js                        # EXISTING — high-water-mark lookup
  src/index.js                                # EXISTING — launcher, unchanged
```

Putting the shared upsert SQL in `src/Helper/PlacementLinkSync.js` keeps `ImportBooking.js`
readable and lets the mapper be unit-tested without running the import.

> **Boundary note:** the activation source lives in the Alphix DB, not FileMaker, so hosting
> its sync in `shepob-filemaker` is a slight stretch of the repo's theme. It is acceptable per
> the "no new shepob" decision; keep it in its own command so the coupling stays visible and it
> can be lifted out later if `shepob-filemaker` is ever split by domain.

---

## TSF → central — appended to `ImportBooking.js`

Right after the existing `ds_fm_bookings_data` upsert + `dc_sites_link_ds_bookings` derived
write, call the shared helper with the same `latestDate` the command already holds. A
**set-based** upsert mirrors the existing derived-write style (no per-row JS) and computes the
click-tracker booleans inline from the source strings:

```js
// src/Helper/PlacementLinkSync.js
const { sql } = require("@fundamentalmedia/shenode");

// Upsert every TSF row modified since `since` into the central table.
exports.syncTsf = async (since) => {
  await sql.query(`
    INSERT INTO di_api.di_booking_placement_link
      (uuid, source, sourceUuid, bookingUniqueNumber, placementId, placementUniqueNumber,
       tsfCurrentAccountId, isClickTracker, placementDateStart,
       placementDateEnd, campaignId, sourceModifiedAt, syncedAt, created_at)
    SELECT UUID(), 'tsf', fbd.uuid, fbd.bookingUniqueNumber, fbd.placementId,
           fbd.placementUniqueNumber, fbd.tsfCurrentAccountId,
           (fbd.tracker_data_selector = 'Click'),   -- → isClickTracker
           fbd.placementDateStart, fbd.placementDateEnd, fbd.campaignId,
           fbd.modifiedHost, NOW(), NOW()
    FROM di_api.ds_fm_bookings_data fbd
    WHERE fbd.modifiedHost >= ?
    ON DUPLICATE KEY UPDATE
      bookingUniqueNumber   = VALUES(bookingUniqueNumber),
      placementId           = VALUES(placementId),
      placementUniqueNumber = VALUES(placementUniqueNumber),
      tsfCurrentAccountId   = VALUES(tsfCurrentAccountId),
      isClickTracker        = VALUES(isClickTracker),
      placementDateStart    = VALUES(placementDateStart),
      placementDateEnd      = VALUES(placementDateEnd),
      campaignId            = VALUES(campaignId),
      sourceModifiedAt      = VALUES(sourceModifiedAt),
      syncedAt              = NOW()
  `, [since]);
};
```

The `(fbd.tracker_data_selector = 'Click')` comparison evaluates to `1`/`0` in MySQL, landing the
boolean directly. A `NULL` source string yields `NULL` → coerce with `COALESCE(... , 0)` if the column is
declared `NOT NULL DEFAULT 0` and you want to be explicit.

```js
// src/Command/ImportBooking.js  (existing command — add at the end, before report.success())
const { syncTsf } = require("../Helper/PlacementLinkSync");
// ...existing FileMaker fetch, ds_fm_bookings_data upsert, dc_sites_link_ds_bookings write...
await syncTsf(latestDate);          // latestDate = the high-water value already used for the FM find
await report.success();
```

Notes:
- Upsert key is the `(source, sourceUuid)` unique index from Stage 1 (`sourceUuid = fbd.uuid`).
- `WHERE modifiedHost >= ?` reuses `ImportBooking`'s existing high-water mark, so the central
  upsert covers exactly the freshly imported rows — no second scan, no separate cursor.
- If `ImportBooking.js` is ever run with a full/`allData` reseed, this set-based statement
  rebuilds the TSF side wholesale — still safe (pure upsert; no human-owned columns to clobber).

## Activation → central — `src/Command/SyncActivationPlacementLink.js`

Not part of the FileMaker pull; scheduled on its own cadence (frequently, since it gates the
`di_ca` feed). Read **only fully-created placements**: a variation has a real `cmPlacementId`
exactly when `stage='DONE'` and `status='COMPLETED'` (set in
`shepob-doubleclick/.../Activation/Manager.js` after the PLACEMENT job). Parent carries
`bookingUniqueNumber`, `cmCampaignId`, `cmAdvertiserId`.

Prefer the **fundadata** path (typed, guarded models already exist):

```js
const { FundadataAlphix, FundadataUser, Fundadata } = require("@fundamentalmedia/fundadata-alphix");
const { sql } = require("@fundamentalmedia/shenode");

module.exports = async (report) => {
  Fundadata.setSuperUserMode(true);                 // infrastructure job
  const fundadata = new FundadataAlphix(new FundadataUser(1));

  const since = (await sql.query(
    `SELECT MAX(sourceModifiedAt) AS d FROM di_api.di_booking_placement_link WHERE source='activation'`
  ))[0].d || '1999-09-09 00:00:00';

  // variations completed & with a CM placement, joined to their parent activation
  const variations = await fundadata.aiAssetBuilder.activationVariationCm
    .query()
    .where('stage', 'DONE').where('status', 'COMPLETED')
    .whereNotNull('cmPlacementId')
    .where('updatedAt', '>=', since)              // adjust to the repo's query API
    .fetch();

  for (const v of variations) {
    const parent = await fundadata.aiAssetBuilder.activationCm.fetchByPrimaryKey(v.activationUuid.value);
    const insertData = {
      uuid: /* generate */, source: 'activation', sourceUuid: v.uuid.value,
      bookingUniqueNumber: parent.bookingUniqueNumber.value,
      placementId: v.cmPlacementId.value,
      placementUniqueNumber: null, tsfCurrentAccountId: null,
      isClickTracker: 0,   // activation placements are not TSF click trackers
      placementDateStart: v.placementStart.value, placementDateEnd: v.placementEnd.value,
      campaignId: parent.cmCampaignId.value, advertiserId: parent.cmAdvertiserId.value,
      siteId: v.siteId.value, sourceModifiedAt: v.updatedAt.value,
      syncedAt: new Date(), created_at: new Date(),
    };
    const updateData = { ...insertData };
    delete updateData.uuid; delete updateData.source; delete updateData.sourceUuid; delete updateData.created_at;
    await sql.insertUpdate('di_api.di_booking_placement_link', insertData, updateData);
  }
  await report.success();
};
```

(The exact fundadata query-builder calls must match the repo's API — confirm against
`activationVariationCm` repo methods; if no `whereNotNull`/comparison helpers exist, add a repo
method `fetchCompletedSince(since)` in `fundadata-alphix` per Stage 2's pattern rather than
inlining query chains here.)

## TSF full backfill — `src/Command/BackfillPlacementLinkTsf.js`

The TSF half above runs **incrementally** (`syncTsf(latestTsfDate)` only covers rows whose
`modifiedHost` advanced since the last import). `ImportBooking.js` has **no full/`allData`
reseed mode**, so a normal import will *not* populate the central table's TSF history. Before the
Stage 4 feed is flipped onto the central table, the TSF side must be backfilled in full.

This standalone command does exactly that by calling the same set-based, idempotent `syncTsf`
upsert from a very old high-water mark:

```js
const { syncTsf } = require("../Helper/PlacementLinkSync");

module.exports = async (report) => {
  const since = report.param(0) || "1999-09-09";   // omit param → full backfill
  await syncTsf(since);
  await report.success();
};
```

- **Full backfill (cutover):** `node src/index.js BackfillPlacementLinkTsf` — defaults `since` to
  `1999-09-09`, the same empty-table default the activation sync uses, so TSF and activation
  backfill behave consistently.
- **Bounded re-backfill:** `node src/index.js BackfillPlacementLinkTsf 2024-01-01`.
- Idempotent and safe to re-run (`INSERT … ON DUPLICATE KEY UPDATE` on `(source, sourceUuid)`,
  no human-owned columns). It is a one-time/on-demand command — **do not** put it on a recurring
  schedule; routine TSF sync stays chained to `ImportBooking`.

## Orphan reconcile — `src/Command/ReconcilePlacementLink.js`

Mirror the delete half of `shepob-intell/src/Command/BookingRelated.js`. A central row is an
orphan when its source row no longer exists:

```sql
-- tsf orphans
DELETE l FROM di_api.di_booking_placement_link l
LEFT JOIN di_api.ds_fm_bookings_data s ON l.sourceUuid = s.uuid
WHERE l.source = 'tsf' AND s.uuid IS NULL;

-- activation orphans (variation deleted OR no longer completed/with placement)
DELETE l FROM di_api.di_booking_placement_link l
LEFT JOIN ai_asset_builder_campaign_activation_variation_cm v
  ON l.sourceUuid = v.uuid AND v.stage = 'DONE' AND v.status = 'COMPLETED' AND v.cmPlacementId IS NOT NULL
WHERE l.source = 'activation' AND v.uuid IS NULL;
```

- The central table has no unlink concept — manual unlinks live in
  `portal_production.di_ca_placement_unlink` and are applied at the Stage 4 feed, so reconcile
  here is purely "source row gone → delete the central row". It must **not** consult the unlink
  table.
- Activation currently has **no teardown flow** (confirmed), so activation deletes are rare
  today; the predicate is correct for when one is added.
- This is a separate command (not inside `ImportBooking.js`) so it can run on its own,
  lighter cadence and a reconcile pass can't lengthen or fail the booking import.

## Scheduling, idempotency, observability

- **TSF half:** runs automatically as the tail of `ImportBooking.js`, immediately after the new
  booking data is fetched and upserted — exactly the "runs after we fetch the new booking data"
  requirement.
- **Activation half + reconcile:** standalone commands, scheduled independently (activation
  frequently; reconcile periodically), both ahead of Stage 4's `di_ca` feed.
- Idempotent: re-running any path produces the same table state (upsert + bounded delete).
- `report.success()` on success; on failure throw so the launcher's catch calls `report.error`.
- No `console.log` in the job path; use the report channel.

## Tests

- Unit-test `Helper/PlacementLinkSync.js` and the activation mapper: assert `isClickTracker` is
  derived correctly (`tracker_data_selector='Click'`; activation rows → `0`).
- Reconcile predicate test (orphan vs. live source row).
- A focused integration test against a test schema (the activation repo already has
  `tests/integration/helpers/factories.ts` that inserts `di_ca_placements`/placements — reuse
  that harness style).

## Verification

- Run `ImportBooking` once → central `source='tsf'` rows reconcile against
  `COUNT(DISTINCT uuid) FROM di_api.ds_fm_bookings_data`.
- Run `SyncActivationPlacementLink` once → `source='activation'` rows reconcile against completed
  variations with `cmPlacementId IS NOT NULL`.
- Delete a source row, run `ReconcilePlacementLink` → central row removed.
- (Unlink durability is verified in Stage 5: the `portal_*` unlink record survives a re-sync
  because the sync never reads or writes it.)
