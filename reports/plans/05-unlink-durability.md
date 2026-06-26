# Stage 5 — Durable manual unlink

**Repos:** `portal-node` (the existing unlink route), `fundadata-alphix` (optional model/repo).
**Goal:** when a user unlinks a booking from a placement, that decision **persists** — it is no
longer silently undone by the next reconciler run.

> **Scope note:** there is **no new unlink route in `alphix-app-node`** — we don't need one at
> present. The existing legacy route (`portal-node` `Unmatch.js`) is the only write path; this
> stage just makes it durable. If/when a modern alphix route is wanted later, point it at the
> `fundadata-alphix` repo in 5a.

---

## The bug we are fixing (confirmed)

`portal-node/src/Api/Doubleclick/Matching/Unmatch.js` runs:

```js
sql.query(
  `DELETE FROM ${sql.writeDB}.di_ca_placements WHERE bookingUniqueNumber = ? AND placementId = ?`,
  [request.body.bookingUniqueNumber, request.body.placementId], ...
);
```

There is **no marker** anywhere recording that the user unlinked. `shepob-intell`'s
`BookingPlacement.js` reconciler re-inserts the row on its next run because the source data
still exists. The unlink is transient. (Route is guarded by
`access.reporting.matchBookings()`.)

## The fix — and the di_api write constraint

**`di_api` is shepob-write-only; node APIs cannot modify it.** So the unlink cannot be a flag on
the central table. Instead, a user unlink writes a durable row to
**`portal_production.di_ca_placement_unlink`** (Stage 1) — a `portal_*` table the node APIs may
write (it is the same schema as `di_ca_placements`, which `Unmatch.js` already deletes from
today). The Stage 4 `di_ca` feed anti-joins that table, so the `di_ca_placements` row is removed
and never re-created while the unlink row exists. Re-link = delete the unlink row. The Stage 3
sync never reads or writes the unlink table, so a re-sync cannot resurrect the link.

That is the whole fix for the original bug: today's `Unmatch.js` deletes the `di_ca_placements`
row with no record, so the reconciler re-adds it. The durable `portal_*` record is what now
survives the reconciler.

### 5a — `portal_*` unlink model/repo (`fundadata-alphix`, optional now)

A fundadata model/repo for the unlink table under the existing `Intell` section (it is
`portal_production`, modelled like `di_ca_placements`'s `ModelIntellPlacement`):

- `src/FundadataAlphix/Intell/Model/PlacementUnlink.ts` — `ModelIntellPlacementUnlink`
  (`_table = 'portal_production.di_ca_placement_unlink'`), booking-asset guard.
- `src/FundadataAlphix/Intell/Repo/PlacementUnlink.ts` — `RepoIntellPlacementUnlink`, exposed as
  `fundadata.intell.placementUnlink`, with `unlink(...)` / `relink(...)` / `isUnlinked(...)`.

**Optional at present.** The live write path is the legacy route (5b) using raw SQL, and the
Stage 4 feed reads the table with raw SQL too — so nothing yet consumes this fundadata repo. Add
it only when a typed reader or a future modern route needs it (it is the path that route would
call). When added, guard it by the booking asset so a user can only (un)link bookings they can
access, and make `unlink` idempotent on the `(placementId, bookingUniqueNumber)` unique key.

### 5b — The unlink route (`portal-node`)

Point the existing `Matching/Unmatch.js` at the unlink table: **INSERT** into
`portal_production.di_ca_placement_unlink` (parameterised raw SQL, legacy style — do not add
fundadata to `portal-node`). Keep the existing `DELETE FROM di_ca_placements` for immediate
effect if desired, and keep the `access.reporting.matchBookings()` guard and response shape. The
INSERT is what makes the unlink durable. (Both writes are to `portal_production`, which the
legacy app already writes — no `di_api` write is introduced.)

Re-link, if/when exposed, is the inverse: **DELETE** the `di_ca_placement_unlink` row; the next
Stage 4 feed re-creates the `di_ca_placements` row.

---

## Edge cases

- **Unlink grain = the di_ca pair.** The unlink row keys on `(placementId, bookingUniqueNumber)`
  — exactly the `di_ca_placements` unique key — so **one** unlink row suppresses every central
  source row (TSF fan-out + activation) that projects to that pair. No need to touch multiple
  rows; this is simpler and more robust than a per-source flag would have been.
- **Source row later deleted:** the unlink row simply has nothing left to suppress; harmless. A
  periodic shepob may prune unlink rows whose `(placementId, bookingUniqueNumber)` no longer
  exists in the central table, to keep the table tidy (optional).
- **Re-link:** delete the unlink row → next Stage 4 feed re-creates the `di_ca_placements` row.

## Tests / verification

- Route test (`portal-node`): unlinking INSERTs a `di_ca_placement_unlink` row (idempotently on
  the unique key) and preserves the `access.reporting.matchBookings()` guard.
- End-to-end (the regression test for the original bug): unlink via `Unmatch.js` → row present in
  `portal_production.di_ca_placement_unlink` → run Stage 4 feed → `di_ca_placements` row gone →
  re-run the booking import (`ImportBooking.js`, TSF→central sync) → unlink row untouched, central
  re-synced → run Stage 4 feed again → row **not** resurrected.

## Coupled artifacts to ship together

The `portal_production.di_ca_placement_unlink` migration (Stage 1), the `Unmatch.js` change + its
test, and a short note in the `portal-node` docs that unlink is now durable (and lives in
`portal_*`). The `fundadata-alphix` model/repo (5a) and any modern `alphix-app-node` route are
deferred until needed.
