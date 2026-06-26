# Consumer 11 — fundadata ORM reading consumers

**Repos:** `fundadata-alphix` (reporting).
**Depends on:** Stage 2.
**Goal:** switch the typed ORM consumers that currently read the TSF table (via the alphix
`Placement` model) onto `fundadata.intell.bookingPlacementLink`.

> **Scope note.** An earlier draft of this stage also migrated `fundadata-reporting-media`
> (which read the table via the `fundadata-intell` `TsfBooking` model). Those repos are **legacy
> and no longer in use**, so they are out of scope — this stage now covers only the live
> `fundadata-alphix` reporting consumers. The retirement of the legacy duplicate models is
> likewise dropped from Stage 16.

---

## Consumers (verified from the report §6)

### `fundadata-alphix` — via `ModelIntellCampaignManagerPlacement` (`fundadata.intell.campaignManager.placement`)

| File | Use | New call |
|---|---|---|
| `Reporting/CampaignInsight/Display/ExcludeCode.ts:89-100` | `search().by(placementId, ids).fetch()` → `{placementId → placementDateStart}` for exclude-code 5 | `fundadata.intell.bookingPlacementLink.fetchPlacementStartDates(ids)` |
| `Reporting/Media/Alphix/Url.ts:194-209` (`_filterOutOfRangePlacements`) | select `placementId, costStructure, placementDateStart` where `placementId IN (...)`; find `costStructure='Click Tracker'` + start dates | `placementDateStart` from `fundadata.intell.bookingPlacementLink.fetchByPlacementId(ids)`; **`costStructure` from `ds_bookings`** (join on `bookingUniqueNumber` via `fundadata.intell.booking`) — keep the `costStructure === 'Click Tracker'` branch |

---

## Migration notes

- **Behaviour must be identical.** The three invariants live entirely in these read paths:
  - exclude-code 5 = drop report rows dated before `placementDateStart` → `fetchPlacementStartDates`
    returns the same `{placementId → date}` map.
  - click-tracker correction = the central table's `isClickTracker` boolean, which the sync derives
    from exactly the `tracker_data_selector === 'Click'` predicate, so the placement set is identical.
  - `costStructure='Click Tracker'` date-window detection (`Url.ts`) → `costStructure` is **not**
    on the central table; read it from **`ds_bookings`** (its real home) by joining on
    `bookingUniqueNumber`, and keep the same `=== 'Click Tracker'` branch. The central table only
    supplies `placementId` + `placementDateStart` here.
- These read paths run inside reporting pipelines that may be **super-user / cross-client**;
  ensure the guard added in Stage 2 does not block them (super-user mode bypasses guards — the
  pipelines that already read `ds_fm_bookings_data` cross-client run that way today).

## Activation rows in reporting

A subtlety: the central table now also contains **activation** placements. The exclude-code and
click-tracker logic key on `placementId`, so activation placements will now be considered too.
That is correct and desirable (they are real CM360 placements with real start dates), but
**flag it for the reporting owners** as a behaviour expansion: report rows for activation
placements dated before their `placementStart` will now be excluded as test data, and activation
placements are eligible for click-tracker correction (they have `isClickTracker = 0`, so they
never trigger it — no change unless that flag is later set for activation). The `Url.ts`
date-window branch keys on `ds_bookings.costStructure`, so it applies to an activation placement
only if its booking is a `'Click Tracker'` — unchanged from today's per-booking semantics.

## Tests / verification

- Vitest: each migrated call asserts the same generated map/result as before, using
  `FundadataConnectionMock`.
- Run the alphix reporting pipeline against a fixture and diff the exclude-code and
  click-tracker outputs pre/post migration — they must match for TSF placements.
