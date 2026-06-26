# Consumer 16 — Legacy TSF ORM model consolidation

**Repos:** `fundadata-alphix`.
**Depends on:** Stages 2 + 11 (so the live consumers are off the link/details reads first).
**Goal:** guard the surviving typed model of `ds_fm_bookings_data` now that the central table +
`intell.bookingPlacementLink` repo is the typed access path for the link. Cleanup, not new
behaviour.

> **Scope note.** The original plan consolidated **three** duplicate models of the one physical
> table. Two of them lived in repos that are now **legacy and no longer in use**:
> `fundadata-intell` (`ModelIntellTsfBooking`) and `fundadata-campaign-manager`
> (`ModelCampaignManagerFmBookingsData`, already dead/unexported). They are out of scope — no
> changes are made to those repos. Only the live `fundadata-alphix` model remains.

---

## The survivor today (verified from the live model)

`di_api.ds_fm_bookings_data` is modelled in `fundadata-alphix` as:

| Package | Model | Repo | Status |
|---|---|---|---|
| `fundadata-alphix` | `ModelIntellCampaignManagerPlacement` | `RepoIntellCampaignManagerPlacement` | live (alphix reporting) |

This model is the *raw `ds_fm_bookings_data`* accessor: it exposes the write-only metadata columns
(impressions, `bookedTotalCost`, `traffickingString`, `product`, …) that the central
`bookingPlacementLink` table deliberately omits. Its field definitions are already correct
(`id` is the sole PK, `traffickingString` is 511, `bookedTotalCost` is an uncapped decimal — the
`maxValue:99` cap and 255 truncation were defects of the now-retired legacy models, not this one).

The one outstanding defect is the **placeholder guard**:

```ts
protected _guard = new FundadataGuard({allOf: [new FundadataGuardPublic]}); // TODO - ADD GUARD RULES IN FOR MODEL
```

## Plan

1. **After Consumer 11 migrates** the live link/details readers off
   `ModelIntellCampaignManagerPlacement` onto `fundadata.intell.bookingPlacementLink`, decide the
   survivor's fate:
   - If any remaining reader still needs the raw `ds_fm_bookings_data` columns the central table
     omits (impressions, `bookedTotalCost`, `traffickingString`, `product`, …), **keep the model**
     as the raw-table accessor and proceed to step 2.
   - If no remaining reader needs those columns, **delete the model + repo** — the central table
     fully replaces it. Confirm with a grep for zero importers before removal.
2. **Add a real guard** to the surviving model — the same booking-asset guard pattern as Stage 2.
   Replace the `FundadataGuard({allOf: [new FundadataGuardPublic]})` + `// TODO` with the narrowest
   correct guard. This is the only field-definition change needed; the rest of the model is already
   correct.

## Boundary / sequencing

- This stage is **strictly cleanup** — it must not change any live read behaviour. Gate it behind
  Consumer 11's verification.
- Distinguish the two access concerns explicitly, because they are easy to conflate:
  - **The link + needed details** → `fundadata.intell.bookingPlacementLink` (central table). New, guarded.
  - **Raw `ds_fm_bookings_data` row** (write-only metadata, ingest audit) → the surviving
    `fundadata-alphix` model, guarded, kept only if a real consumer needs those columns.
- `shepob-filemaker` (the only writer of `ds_fm_bookings_data`) is unaffected — it writes via
  raw `sql.insertUpdate`, not these ORM models.

## Verification

- `fundadata-alphix` typecheck + Vitest green after the guard change (or after deletion).
- Grep confirms zero remaining importers before any model/repo removal.
- The model's spec asserts the enforced guard (no more `FundadataGuardPublic` + TODO).
