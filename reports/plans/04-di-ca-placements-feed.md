# Stage 4 — Re-point the `di_ca_placements` feed at the central table

**Repo:** `shepob-intell`
**File:** `src/Command/BookingPlacement.js`
**Goal:** `di_ca_placements` is now derived from `di_api.di_booking_placement_link` (the table
of record) instead of directly from `ds_fm_bookings_data` + `ds_bookings_related`, and it picks
up **activation** placements too — while preserving today's exact semantics (the related-booking
fan-out) and honouring manual unlinks.

`di_ca_placements`, its schema, and all its readers are **unchanged**. Only this builder
changes.

---

## What it does today (verified — full current file)

`BookingPlacement.js` runs two statements:

1. **INSERT IGNORE** into `portal_production.di_ca_placements (placementId, tsfUuid,
   bookingUniqueNumber, created_at, updated_at)` selecting from
   `dc_placements ⨝ ds_fm_bookings_data (placementId) ⨝ ds_bookings_related
   (tsfCurrentAccountId = ds_bookings_related.uuid)`, where the link doesn't already exist.
2. **DELETE** orphans: rows where `tsfUuid != ''` and the backing `ds_fm_bookings_data.uuid`
   *or* `ds_bookings_related.bookingUniqueNumber` has disappeared.

Two semantics to preserve:
- **The `ds_bookings_related` fan-out** — one TSF placement (`uuid`/`placementId`) produces a
  `di_ca_placements` row per *related* booking (parent/credited), via
  `tsfCurrentAccountId → ds_bookings_related.uuid → bookingUniqueNumber`. This is why the
  central table carries `tsfCurrentAccountId`.
- **The `tsfUuid != ''` delete guard** — rows whose `tsfUuid` is empty are never deleted by the
  reconciler. This already protects non-TSF rows; activation rows (which we now feed with empty
  `tsfUuid`) inherit that protection. The new build supersedes this with an explicit
  `want`-set/unlink overlay below.

The unlink overlay reads `portal_production.di_ca_placement_unlink` (Stage 1, written by the
node APIs in Stage 5). Both the central table and this unlink table are in schemas
`shepob-intell` may read, so this feed (a shepob) can enforce the overlay even though node APIs
can't touch `di_api`.

---

## New build (sourced from central)

```sql
-- 1) INSERT IGNORE — TSF links, fanned out over related bookings, from the central table,
--    skipping any (placementId, bookingUniqueNumber) a user has unlinked
INSERT IGNORE INTO portal_production.di_ca_placements
  (placementId, tsfUuid, bookingUniqueNumber, created_at, updated_at)
SELECT l.placementId, l.sourceUuid, dbr.bookingUniqueNumber, NOW(), NOW()
FROM di_api.di_booking_placement_link l
JOIN di_api.ds_bookings_related dbr ON l.tsfCurrentAccountId = dbr.uuid
LEFT JOIN portal_production.di_ca_placement_unlink u
  ON u.placementId = l.placementId AND u.bookingUniqueNumber = dbr.bookingUniqueNumber
WHERE l.source = 'tsf'
  AND l.placementId IS NOT NULL
  AND u.id IS NULL;                 -- not unlinked

-- 2) INSERT IGNORE — activation links (no fan-out; direct booking; tsfUuid empty)
INSERT IGNORE INTO portal_production.di_ca_placements
  (placementId, tsfUuid, bookingUniqueNumber, created_at, updated_at)
SELECT l.placementId, '', l.bookingUniqueNumber, NOW(), NOW()
FROM di_api.di_booking_placement_link l
LEFT JOIN portal_production.di_ca_placement_unlink u
  ON u.placementId = l.placementId AND u.bookingUniqueNumber = l.bookingUniqueNumber
WHERE l.source = 'activation'
  AND l.placementId IS NOT NULL
  AND u.id IS NULL;                 -- not unlinked
```

The `dc_placements` join from the original is no longer needed for the *TSF* insert because the
central table already carries the resolved `placementId` (it was sourced from
`ds_fm_bookings_data.placementId`, same value `dc_placements` provided). If a referential check
against `dc_placements` is desired (only insert placements CM actually knows about), keep an
`JOIN di_api.dc_placements dp ON dp.placementId = l.placementId` — decide based on whether
activation placements are guaranteed present in `dc_placements` at feed time.

```sql
-- 3) DELETE — reconcile: remove di_ca rows no longer backed by a (non-unlinked) central link
--    (covers source-row deletion AND manual unlink, in one predicate)
DELETE dcp FROM portal_production.di_ca_placements dcp
LEFT JOIN (
    -- the set of (placementId, tsfUuid, bookingUniqueNumber) that SHOULD exist
    -- (unlinked pairs are excluded by the anti-join to di_ca_placement_unlink)
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
    WHERE l.source='activation' AND l.placementId IS NOT NULL AND u.id IS NULL
) want
  ON dcp.placementId = want.placementId
 AND dcp.tsfUuid = want.tsfUuid
 AND dcp.bookingUniqueNumber = want.bookingUniqueNumber
WHERE want.placementId IS NULL;
```

> **Behaviour change for the better:** previously a manually-unlinked row was silently
> re-created on the next run (the report's confirmed bug). Now an unlink is a durable row in
> `portal_production.di_ca_placement_unlink` (Stage 5); it is anti-joined out of the `want` set
> and the inserts, so step 3 deletes the `di_ca_placements` row and steps 1–2 never re-add it.
> The unlink is durable, and it lives in `portal_*` where the node APIs can write it — `di_api`
> stays shepob-only.
>
> **Compatibility caveat:** the old DELETE only touched `tsfUuid != ''` rows; this new DELETE,
> via the `UNION` `want` set, governs activation rows too. Before enabling, confirm no other
> writer puts rows into `di_ca_placements` that the central table won't know about. The
> investigation found only `shepob-intell` (this job), the user `Unmatch` route (Stage 5), and
> a `shepob-doubleclick/Report.js` **UPDATE** (enriches `placementRatio` etc., never inserts).
> If `Report.js`'s UPDATE-derived columns must survive, the DELETE is still safe (it only
> removes rows with no backing link). Verify the `placementRatio`/cost columns are recomputed,
> not lost, after a delete+reinsert cycle.

---

## Cutover corrections (surfaced by the Stage 12 shadow diff — applied)

The first shadow run exposed two parity breaks against the legacy feed. Both are now fixed in
`BookingPlacement.js`:

1. **Manual matches were being deleted.** Users can manually link a booking↔placement via the
   portal (`portal-node` `Matching/Match.js`), which `INSERT`s a `di_ca_placements` row with
   `userId` set and **`tsfUuid` NULL**. The legacy reconciler protected these with a
   `tsfUuid IS NOT NULL AND tsfUuid != ''` guard; the first rewrite dropped it, so ~1,800 manual
   rows were flagged for deletion. Fix:
   - Activation rows now carry **`tsfUuid = l.sourceUuid`** (the variation uuid), not `''`, so
     they are distinguishable from manual rows and still reconcilable.
   - The DELETE restores the guard (`dcp.tsfUuid IS NOT NULL AND dcp.tsfUuid != ''`), so manual
     rows (NULL/empty `tsfUuid`) are never touched. `portal-node` `Matching/Alert.js` likewise
     keys "manual" off `tsfUuid IS NULL`, confirming this is the right discriminator.

2. **`dc_placements` referential filter was dropped.** The legacy feed started
   `FROM di_api.dc_placements`, so it only created rows for CM-known placements. The first rewrite
   dropped that join, adding ~26k TSF links whose `placementId` is absent from `dc_placements`. Fix:
   the TSF `INSERT` and the TSF branch of the `want` set re-add `JOIN di_api.dc_placements`.
   (Activation is intentionally **not** filtered by `dc_placements` — activation rows are net-new
   to `di_ca_placements` so there is no parity to preserve, and requiring `dc_placements` presence
   could delay very-new activation placements; revisit if CM-known-only is wanted for activation too.)

The shared `WANT_SQL` constant (now carrying a `src` marker) is used verbatim by both the live
DELETE and the read-only `shadow` mode, so the preview cannot drift from the job.

## Migration approach (safe cutover)

1. Land Stages 1–3 so the central table is populated and trustworthy.
2. **Shadow run:** add the new SQL behind a parameter (`report.param(0) === 'central'`) or a
   second command (`BookingPlacementFromCentral.js`) and run it against a **copy**/in a
   read-only diff mode; compare its intended INSERT/DELETE set to the current table.
3. Diff must be empty for TSF rows (same inputs, same output) and additive for activation rows.
4. Flip `BookingPlacement.js` to the central-sourced statements; keep the old SQL in git history
   / commented for one release, then remove.

## Tests / verification

- Row-count parity for TSF-origin `di_ca_placements` rows before vs. after cutover.
- New activation placements now appear in `di_ca_placements` (previously missing — this is the
  unification payoff that `BookingCampaignLink.resolveBookingCampaignLink` benefits from).
- Unlink a link (Stage 5) → row gone after this job and **not** resurrected on re-run.
- `placementRatio`/cost enrichment by `shepob-doubleclick/Report.js` still present for surviving
  rows.

## Ownership note

`di_ca_placements` stays owned by `shepob-intell`; we only change its source of truth. We do
**not** move the feed into the Stage 3 sync (in `shepob-filemaker`) — that would blur the
boundary between "populate the record table" (Stage 3) and "project it into the legacy bridge"
(`shepob-intell`).
