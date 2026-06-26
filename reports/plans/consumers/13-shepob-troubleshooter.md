# Consumer 13 — `shepob-troubleshooter`

**Depends on:** Stage 2 (ORM) + Stage 3 (central populated).
**Goal:** re-point the single `ds_fm_bookings_data` reader at the central table.

---

## Reader (verified from report §4)

`src/Command/InvalidUrl.js:70` — `LEFT JOIN ds_fm_bookings_data` to supply the expected
`placementUniqueNumber` for a landing page (read `placementId`, `placementUniqueNumber`); the
URL's CA-tag is parsed and compared, and a mismatch sets a `wrongPlacementId` flag written to
`dc_placement_landing_page.error_code`.

## Change

Replace the join target with `di_api.di_booking_placement_link`, selecting `placementId`,
`placementUniqueNumber`, filtered to `source='tsf'` (only TSF rows have a
`placementUniqueNumber`; activation rows have `NULL` and are not relevant to FileMaker landing-
page CA-tag validation). No unlink filtering — unlink affects the `di_ca_placements` bridge,
not the `placementUniqueNumber` validated here.

```sql
LEFT JOIN di_api.di_booking_placement_link l
  ON <existing join key> = l.placementId
 AND l.source = 'tsf'
 AND l.placementUniqueNumber IS NOT NULL
```

## Correctness

- This validation is inherently TSF/FileMaker-specific (it checks the FileMaker
  `placementUniqueNumber` embedded in a landing-page CA tag), so scoping to `source='tsf'` is
  correct and avoids false mismatches against activation placements that legitimately have no
  `placementUniqueNumber`.
- Multi-row-per-`placementId`: scoping to `source='tsf'` plus the existing key should yield one
  expected `placementUniqueNumber`; if duplicates are possible, keep the existing
  one-row-expectation behaviour (the original `ds_fm_bookings_data` had a unique
  `placementUniqueNumber`).

## Tests / verification

- Diff the `wrongPlacementId`/`error_code` outcomes against the old query on a fixture set —
  identical for TSF placements.
- Confirm landing pages for activation-only placements are not newly flagged (they have no
  `placementUniqueNumber` to validate against).
