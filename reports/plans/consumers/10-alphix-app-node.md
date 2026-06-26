# Consumer 10 — `alphix-app-node`

**Depends on:** Stage 2 (ORM section). Independent of the other consumer plans.
**Goal:** replace the verbatim legacy raw-SQL read of `ds_fm_bookings_data` with the typed,
guarded `fundadata.intell.bookingPlacementLink` repo.

---

## What reads the table here

`src/Lookup/Analytics/TrafficLink.js` — `mapLinks()` (~`:76-80`). Reads `placementId` +
`placementUniqueNumber` (joined to `dc_placements.name`) to resolve a placement name and
canonical `placementId` onto analytics traffic-link rows keyed
`cm~<placementId>~<bookingUniqueNumber>`. **It is a byte-identical copy of the legacy
`portal-node` file** — lifted, not rebuilt on fundadata, even though a typed model already
existed.

This is the prime migration candidate the report calls out.

## Change

1. Replace the raw `ds_fm_bookings_data` query in `mapLinks()` with
   `this.fundadata.intell.bookingPlacementLink.fetchPlacementUniqueMap(...)` (Stage 2 repo method) — returning
   `{placementUniqueNumber → placementId}` and the placement name (the name still comes from
   `dc_placements`; either join it in the repo method via the `placementId` link, or keep a
   thin `dc_placements` name lookup if the report's "joined `dc_placements.name`" is needed).
2. Routes already expose request-scoped `this.fundadata` for authenticated requests — use it,
   so the read is **guarded** (the legacy copy had no authorization).
3. Keep the existing response/lookup contract identical (same map shape consumers expect).

## Correctness invariants to preserve

- The `placementUniqueNumber ↔ placementId` translation is exact — the central table carries
  `placementUniqueNumber` only for `source='tsf'` rows, which is precisely where analytics
  traffic-links originate. Activation placements have no `placementUniqueNumber`, so they
  correctly don't participate in this legacy analytics mapping.
- No unlink filtering here. Unlink is a `di_ca_placements`-only overlay (a `portal_*` table
  applied at the Stage 4 feed); it never affected analytics name/id resolution, which reads
  placement attributes, not the booking↔placement bridge.

## Tests / verification

- Add a focused test that `mapLinks()` produces the same map for a fixture set as the old SQL
  did (golden test against a captured input/output pair).
- Manual verification of an analytics traffic-link page that exercises `TrafficLink`.

## Note

This is the live main-stack path; migrating it (and deleting the verbatim duplication) is the
highest-value single consumer change. The legacy original in `portal-node` is handled in
Consumer 15.
