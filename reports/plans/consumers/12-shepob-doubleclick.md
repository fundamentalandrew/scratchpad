# Consumer 12 — `shepob-doubleclick`

**Depends on:** Stage 2 (ORM) + Stage 3 (central populated).
**Goal:** re-point the four `ds_fm_bookings_data` readers in this job at the central table.

These are raw-SQL background-job readers. `shepob-doubleclick` already uses raw SQL heavily;
the migration keeps SQL (parameterised) but changes the source table, OR adopts the
`fundadata.intell.bookingPlacementLink` repo if the job already wires fundadata. Pick per existing local
style file-by-file — do not force a framework change into a legacy job (CLAUDE.md).

---

## Readers (verified from report §4)

| File | Current read | New source |
|---|---|---|
| `src/Doubleclick/Report.js:495-499` (`postTableImport`) | `UPDATE <reportTable> rd LEFT JOIN ds_fm_bookings_data dfbd ON rd.placementId=dfbd.placementId SET rd.excludeCode = IF(dfbd.placementDateStart IS NULL OR rd.date>=dfbd.placementDateStart, 0, 5)` over last 730 days | join `di_api.di_booking_placement_link l ON rd.placementId = l.placementId` (use `MIN(placementDateStart)` per placementId — see below) |
| `src/Command/Cost/BookingUpdated.js:13` | `LEFT JOIN ds_fm_bookings_data dfbd … dfbd.modifiedHost > DATE_SUB(dbp.costProcessed, INTERVAL 1 DAY)` re-triggers `processCost()` | join central `ON … l.bookingUniqueNumber` and compare `l.sourceModifiedAt` |
| `src/Command/PopulateModifiedPlacementCreativeDateUrl.js:22-29` | `SELECT DISTINCT placementId WHERE modifiedHost >= ? AND placementId IS NOT NULL` | `SELECT DISTINCT placementId FROM di_api.di_booking_placement_link WHERE sourceModifiedAt >= ? AND placementId IS NOT NULL` |
| `src/Helper/PlacementCreativeDateUrl.js:548-552` | `SELECT placementId … WHERE tracker_data_selector='Click' AND placementId>0` | `SELECT DISTINCT placementId FROM di_api.di_booking_placement_link WHERE isClickTracker=1 AND placementId>0` |

---

## Key correctness considerations

- **`placementId` is now potentially many-rows-per-id.** `ds_fm_bookings_data` was effectively
  one row per placement; the central table can have multiple rows per `placementId` (TSF +
  activation, or fan-out is *not* here but multi-source is). Every join on `placementId` must
  collapse to one value:
  - For `Report.js` exclude-code: use the **earliest** start
    (`MIN(placementDateStart)` grouped by `placementId`) so a placement is "started" by its
    earliest window — match current semantics where one row existed. Confirm with the reporting
    owner whether earliest vs. per-source is correct; document the choice.
  - For the click-tracker `SELECT DISTINCT placementId` and modified-placement queries, `DISTINCT`
    already collapses — fine.
- **`sourceModifiedAt` replaces `modifiedHost`** for both change-detection queries
  (`BookingUpdated`, `PopulateModified…`). It carries TSF `modifiedHost` for tsf rows and
  activation `updatedAt` for activation rows, so cost recalculation will now also trigger when an
  **activation** placement changes — a desirable expansion; flag to the cost owner.
- **Exclude-code over activation placements:** activation placements now get exclude-code
  treatment based on their `placementStart`. Correct and desired.

## Approach

- Prefer a single shared helper/subquery `SELECT placementId, MIN(placementDateStart) AS
  placementDateStart, MAX(sourceModifiedAt) AS sourceModifiedAt, MAX(isClickTracker) AS
  isClickTracker FROM di_api.di_booking_placement_link GROUP BY placementId` and join that, so all
  four readers share one canonical per-placement projection.
- **No unlink filtering here.** These readers correct/exclude *placement* metrics by
  `placementId`; unlink only removes a booking↔placement *bridge* row (`di_ca_placements`) and
  never changed these placement-attribute reads. So they read the central table directly, as they
  read `ds_fm_bookings_data` before.

## Tests / verification

- For each reader, diff the produced `excludeCode` values / changed-placement set / click-tracker
  set against the old query on a fixture — identical for TSF placements.
- Confirm cost reprocessing still fires for a TSF booking whose `modifiedHost` advanced.
- Confirm an activation placement now also participates (new behaviour) and the owner has signed
  off.
