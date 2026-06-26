# Stage 2 — `fundadata-alphix` model/repo for the central table

**Repo:** `fundadata-alphix`
**Goal:** a gold-standard model/repo/guard/link for `di_api.di_booking_placement_link`, added to
the **existing `Intell` section** (no new section), exposed as
`fundadata.intell.bookingPlacementLink`, with a **real guard** and Vitest coverage.

This is the single typed access path every modern consumer (Stages 10–14) will use. Get the
contract right here.

---

## Reference patterns (verified, copy these)

| Concern | Reference file |
|---|---|
| Section class (lazy repo getters) | `src/FundadataAlphix/Intell/index.ts` |
| Model owning a `di_api`/bridge table | `src/FundadataAlphix/Intell/Model/Placement.ts` (`di_ca_placements`) |
| `di_api`-schema model | `src/FundadataAlphix/Google/CampaignManager/Model/FmCampaign.ts` |
| Repo with domain methods | `src/FundadataAlphix/Google/CampaignManager/Repo/FmCampaign.ts` |
| Repo getter to extend | `src/FundadataAlphix/Intell/index.ts` (`SectionIntell` — add `bookingPlacementLink` next to `placement`/`campaignManager`) |
| Guard (asset-based) | `src/FundadataAlphix/Intell/Model/Placement.ts` guard + `fundadata/src/Fundadata/Guard/Asset.ts` |
| Link + Asset | `src/FundadataAlphix/Intell/Link/BookingNumber.ts`, `src/FundadataAlphix/Intell/Asset/Booking.ts` |
| Vitest + mock connection | `src/FundadataAlphix/Intell/Repo/Booking.spec.ts`, `src/test/mockConnection.ts` |

---

## Files to add (under the existing `Intell` section)

```
src/FundadataAlphix/Intell/
  Model/BookingPlacementLink.ts        # ModelIntellBookingPlacementLink (_table = 'di_api.di_booking_placement_link')
  Repo/BookingPlacementLink.ts         # RepoIntellBookingPlacementLink
  Repo/BookingPlacementLink.spec.ts    # Vitest
  # reuse the existing Link/BookingNumber.ts — LinkIntellBookingNumber already maps ds_bookings
```

And one edit to `src/FundadataAlphix/Intell/index.ts` to expose the repo getter
(`bookingPlacementLink`). No new section, and `src/index.ts` (root) needs no change because the
`Intell` section is already wired in.

---

## Model — `ModelIntellBookingPlacementLink`

Follow `Intell/Model/Placement.ts`. Key points:

- `protected _table = 'di_api.di_booking_placement_link';` (schema-qualified, like
  `FmCampaign.ts` uses the `di_api` schema).
- `protected _guard` — **real guard, not Public** (see below).
- One public field per column from Stage 1. Field-name guidance:
  - Use camelCase declarations; map snake_case DB columns (`created_at`, `updated_at`) the way
    the existing models do (the codebase keeps `created_at`/`updated_at` as-is on legacy
    di_api tables — match `Intell/Model/Placement.ts`).
  - `id`: `primaryKey: true`.
  - `uuid`: unique; `setOnCreate` to generate if the base model supports it (check how
    activation models populate `uuid`).
  - `bookingUniqueNumber`: `link: new LinkIntellBookingNumber()` (so joins to `ds_bookings`,
    guard inheritance, and reporting work — same link the intell models use).
  - `placementId`: `link` to the CM placement model
    (`Google/CampaignManager/Link/Placement.ts`) so it can join `dc_placements`.
  - `placementDateStart` / `placementDateEnd`: date fields, `allowNull: true`.
  - `sourceModifiedAt` / `syncedAt`: date with `includeTime: true`, `allowNull: true`.
  - `isClickTracker`: boolean/tinyint field, `allowNull: false`, default `0` (model it as the
    field type the codebase uses for tinyint booleans). No cost-structure field — `costStructure`
    stays in `ds_bookings` (Consumer 11 reads it from there).
- The model carries **no unlink columns** — the central table is shepob-write-only sync data.
  Manual-unlink state is a separate `portal_*` model (Stage 5).
- **Fix the bugs the report flagged** (do not inherit them): correct lengths, no bogus
  `maxValue` caps on numeric/cost fields, correct nullability.

## Guard — real authorization

All three existing TSF models use `FundadataGuardPublic` with a literal `// TODO - ADD GUARD
RULES`. **We do not repeat that.** The link belongs to a booking, which belongs to a client
asset — the same boundary `Intell/Model/Placement.ts` (di_ca_placements) already uses:

```ts
protected _guard = new FundadataGuard({
  allOf: [ new FundadataGuardAsset(new AssetIntellBooking()) ],
});
```

Confirm `AssetIntellBooking` resolves authorization via `bookingUniqueNumber → ds_bookings →
client`. If the link must also be reachable in infrastructure/reporting contexts that run as
super-user, that path already bypasses guards (`Fundadata.setSuperUserMode(true)` — see Stage
3), so the guard does not block the sync job.

## Repo — `RepoIntellBookingPlacementLink`

Follow `Google/CampaignManager/Repo/FmCampaign.ts`:

- `_model = () => new ModelIntellBookingPlacementLink(...).setup();`
- Narrow `empty()` / `fetchByPrimaryKey()` return types, then `super`.
- Domain methods (named, so consumers don't scatter query-builder chains — these directly
  replace the raw SQL in Stages 10–15):

  | Method | Replaces |
  |---|---|
  | `fetchByPlacementId(placementId \| placementId[])` | the universal placementId lookup |
  | `fetchByBookingUniqueNumber(bookingUniqueNumber)` | booking→placement resolution (BookingCampaignLink, cost reprocessing) |
  | `fetchPlacementStartDates(placementIds)` → `{placementId: placementDateStart}` | exclude-code 5 maps (`ExcludeCode.ts`, `Report.js`) |
  | `fetchClickTrackerPlacementIds(placementIds)` → ids where `isClickTracker = 1` | click-tracker metric correction |
  | `fetchPlacementUniqueMap(...)` → `{placementUniqueNumber: placementId}` & inverse | analytics translation, URL validation |
  | `fetchByBookingUniqueNumber(...)` (all source rows for a booking) | di_ca feed source, booking↔campaign resolution |

- These are plain reads of synced data — **no `linkStatus`/active filtering** here. Unlink is a
  `di_ca_placements`-only overlay applied at the Stage 4 feed (it never affected the
  placement-attribute reads these methods replace), so central-table readers do not consult it.

## Tests (`Repo/BookingPlacementLink.spec.ts`)

Mirror `Intell/Repo/Booking.spec.ts` using `FundadataConnectionMock` (`src/test/mockConnection.ts`):
assert generated SQL + params for each domain method, especially:
- `fetchPlacementStartDates` emits the right `placementId IN (...)` and selects only
  `placementId, placementDateStart`.
- `fetchClickTrackerPlacementIds` filters `isClickTracker = 1` and `placementId > 0`.
- guard fields are applied (compare against how `Booking.spec.ts` asserts guard joins).

## Section registration (`src/FundadataAlphix/Intell/index.ts`)

No new section. Add a lazy repo getter to the existing `SectionIntell`, next to its current
`placement` / `campaignManager` getters:

```ts
get bookingPlacementLink(): RepoIntellBookingPlacementLink {
  return this.getRepoOption(RepoIntellBookingPlacementLink);
}
```

(Match the exact `getRepoOption(...)` signature the other `Intell` getters use.) The `Intell`
section is already registered on the `FundadataAlphix` root, so `src/index.ts` needs no change.

## Verification

- `npm run typecheck` / `npm test` (Vitest) green in `fundadata-alphix`.
- Reachable: `new FundadataAlphix(user).intell.bookingPlacementLink.query()…` compiles.
- Guard test proves a user without the booking's client asset cannot read foreign rows.

## Out of scope here (tracked elsewhere)

- Consolidating the three legacy TSF models → Stage 16.
- Actually switching consumers onto these methods → Stages 10–15.
