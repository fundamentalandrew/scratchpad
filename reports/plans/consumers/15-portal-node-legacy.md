# Consumer 15 — `portal-node` (legacy)

**Depends on:** Stage 1 (table) at minimum; Stage 2 if the legacy app can reach fundadata.
**Goal:** re-point legacy analytics / GCM-traffic / tag-reporting readers of
`ds_fm_bookings_data` at the central table — **everything**, per the locked decision.

---

## Scoping note (read first)

`portal-node` is **legacy / maintenance-only** per the workspace CLAUDE.md, which says not to
push new patterns into it. The requester explicitly chose to migrate it anyway. To honour both:

- Keep changes **table-source-only** and **parameterised raw SQL** — do **not** introduce
  fundadata, new abstractions, or refactors into `portal-node`. Swap `ds_fm_bookings_data` for
  `di_api.di_booking_placement_link` in the existing query shape and nothing more.
- Treat this as the **last** wave: only after the modern stack (Consumers 10–14) is migrated and
  the central table has proven parity. Several of these `portal-node` lookups are duplicated in
  the modern stack (e.g. `TrafficLink.js`); migrating modern first de-risks legacy.

---

## Readers (verified from report §5)

| File | Columns | Use | New source |
|---|---|---|---|
| `src/Lookup/Analytics/TrafficLink.js` | `placementId`, `placementUniqueNumber` (+ `dc_placements.name`) | analytics traffic-link name/id resolution (the original of the `alphix-app-node` copy) | central, `source='tsf'` |
| `src/Lookup/Analytics/Booking.js` (×3) | `placementUniqueNumber`, `placementId` | build `placementUniqueNumber→placementId` map to rewrite analytics rows; expand exclude lists | central, `source='tsf'` |
| `src/Lookup/Analytics/Link.js` | `placementUniqueNumber`, `placementId` | `findPlacementUnique()` id-pair lookup | central, `source='tsf'` |
| `src/Lookup/Gcm/Traffic/Booking.js` (×5) | `placementId`, `tracker_data_selector` | click-tracker exclusion from impression/cost sums; clicks→`standAloneClicks` | central |
| `src/Lookup/Gcm/Traffic/Placement.js` (×5) | `placementId`, `tracker_data_selector` | same click-tracker exclusion across daily/creative/device/dynamic | central |
| `src/Lookup/Client/Booking.js` | `placementId`, `placementDateStart` | `getBookingStartDate()` per-placement start, test-data exclusion | central |
| `src/Lookup/Tag/Reporting.js` | `placementId`, `bookingUniqueNumber`, `placementDateStart` | BigQuery `EXTERNAL_QUERY` federated into MySQL; `placementDateStart` gates entrances | central (see federated note) |

`src/views/Home.vue:248` (portal-vue) is a **comment-only** changelog reference — update the
text, no query.

---

## Per-family guidance

- **Analytics translation (`TrafficLink`, `Booking`, `Link`):** scope to `source='tsf'` and
  `placementUniqueNumber IS NOT NULL` — analytics rows are keyed off the FileMaker
  `placementUniqueNumber`, which only TSF rows have. Identical map output expected.
- **Click-tracker exclusion (`Gcm/Traffic/Booking`, `Gcm/Traffic/Placement`):** replace
  `… ds_fm_bookings_data WHERE tracker_data_selector='Click' AND placementId>0` with
  `… di_api.di_booking_placement_link WHERE isClickTracker=1 AND placementId>0` (the sync derives
  `isClickTracker` from exactly `tracker_data_selector='Click'`, so the placement set is
  identical). Use `SELECT DISTINCT placementId` (the central table may have multiple rows per
  placement). No unlink filtering — this is a placement attribute, not the booking↔placement
  bridge.
- **Start-date exclusion (`Client/Booking`, `Tag/Reporting`):** use `MIN(placementDateStart)`
  grouped by `placementId` (same earliest-window semantics as Consumer 12) so the per-placement
  start date is single-valued.
- **`Tag/Reporting.js` federated query:** this runs a BigQuery `EXTERNAL_QUERY` against the live
  MySQL table. Confirm the central table is reachable from the same MySQL endpoint/credentials
  the federated query uses (it is in the same `di_api` schema as `ds_fm_bookings_data`, so it
  should be). This is the one reader with an external-system coupling — verify the federated
  connection sees the new table before cutover.

## Multi-row-per-placementId caveat (applies to all)

`ds_fm_bookings_data` was effectively one row per placement; the central table is not. Every
`portal-node` query that assumed one row per `placementId` must add `DISTINCT` or a
`GROUP BY placementId` with `MIN(placementDateStart)` to stay single-valued. Audit each of the
~20 query sites for this.

## Tests / verification

`portal-node` has uneven test coverage. Use captured input/output golden comparisons per
lookup, plus manual verification of the affected analytics/GCM-traffic reports. Migrate and
verify one lookup family at a time; do not batch all ~20 sites in one change.
