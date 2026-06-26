# Consumer 14 — `asset-builder-service`

**Depends on:** Stage 2 (ORM) + Stage 3 (central populated, including activation rows).
**Goal:** simplify booking→campaign resolution by reading the **one** unified link table
instead of reconciling two sources at query time.

---

## What reads booking↔placement here (verified)

`src/Service/BookingCampaignLink.ts` — `resolveBookingCampaignLink(fundadata, bookingUniqueNumber)`
currently fans out to **two** sources and reconciles them:

```ts
const [externalPlacements, activations] = await Promise.all([
  fundadata.google.campaignManager.placement.fetchByBookingUniqueNumber(bookingUniqueNumber), // di_ca_placements → dc_placements
  fundadata.aiAssetBuilder.activationCm.fetchByBookingUniqueNumber(bookingUniqueNumber),       // our activations
]);
```

It collects the distinct CM campaign ids across both, flags `conflict` if >1, and returns
`{linked, cmCampaignId, advertiserId, campaignName, campaignUuid, sources, conflict}`. This
powers the "one booking → one campaign" enforcement in `Controller/Activation.ts`.

## The opportunity

The central table already unifies both sources keyed by `bookingUniqueNumber` and carries
`placementId`, `campaignId`, `advertiserId`. So the "external placements" half of the
reconciliation can read the central table directly instead of joining
`di_ca_placements → dc_placements`.

### Two migration shapes (choose)

1. **Minimal / safe:** leave `resolveBookingCampaignLink` reading `di_ca_placements` (which
   Stage 4 now also populates with activation placements). No code change — activation placements
   flow into `di_ca_placements`, so `fetchByBookingUniqueNumber` already sees them. **Verify**
   this doesn't double-count: an activation campaign would now appear via *both* the external-
   placement path and the activation path, but they resolve to the **same** `cmCampaignId`, so
   `distinct` collapses to one and `conflict` stays false. Confirm with a test.

2. **Cleaner:** replace the external-placement read with
   `fundadata.intell.bookingPlacementLink.fetchByBookingUniqueNumber(bookingUniqueNumber)` returning
   `{placementId, campaignId, advertiserId, source}` rows; derive the distinct campaign set from
   that single call (still optionally union the in-flight activations that have no
   `cmPlacementId`/`campaignId` yet — see below). Drop the `google.campaignManager.placement`
   dependency from this path.

**Recommendation: shape 1 first** (it's a no-op code change that the unification makes correct),
then shape 2 as a follow-up once Stage 4 parity is proven — lowest risk to a flow that gates
campaign creation.

## Critical edge case — in-flight activations

`resolveBookingCampaignLink` must still see activations that exist but are **not yet
trafficked** (no `cmPlacementId`, possibly no `cmCampaignId` yet) so the "booking already being
activated" guard works. The central table only contains **completed** activation placements
(Stage 3 emits rows only when `cmPlacementId IS NOT NULL`). Therefore the
`fundadata.aiAssetBuilder.activationCm.fetchByBookingUniqueNumber(...)` half **must stay** — do
not replace it with the central table. Only the *external placement* half is a migration
candidate. This is the load-bearing correctness point of this plan.

## Tests / verification

- Existing `asset-builder-service` integration tests (the harness in
  `tests/integration/helpers/factories.ts` seeds `di_ca_placements`) must stay green.
- Add a test: a booking with a completed activation placement resolves to exactly one
  `cmCampaignId` with `conflict=false`, whether read via di_ca_placements (shape 1) or the
  central table (shape 2).
- Add a test: a booking with an **in-flight** activation (no `cmPlacementId`) is still reported
  as linked via the activation half.
