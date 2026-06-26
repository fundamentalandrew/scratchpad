# Activation: Booking → Placement Linking & Date Flow

A summary of how the asset-builder activation system links a **booking** to CM360
**placements**, and how **placement dates** are derived, stored, and propagated to
Campaign Manager 360 (CM360).

## TL;DR

- A booking is identified by `bookingUniqueNumber`. The activation system enforces
  **one booking → one CM360 campaign**, then records **N placements** (one per
  approved creative variation) under that campaign.
- Linking happens in two layers: a parent `ActivationCm` row (booking + advertiser +
  campaign) and child `ActivationVariationCm` rows (per-placement: site, dates, names).
- Placement dates are **supplied per variation** in the POST body, **snapshotted**
  onto the child rows at activation time, then forwarded **verbatim** (only reformatted)
  to CM360 by the managing shepob (`shepob-doubleclick`).

---

## 1. Data model

### Parent — `ActivationCm`
`fundadata-alphix/src/FundadataAlphix/AiAssetBuilder/Model/ActivationCm.ts`
Table: `ai_asset_builder_campaign_activation_cm`

| Field | Role |
| --- | --- |
| `uuid` | Primary key |
| `campaignUuid` | Our asset-builder campaign |
| `bookingUniqueNumber` | **The link to the booking** (`ds_bookings`) |
| `cmAdvertiserId` | CM360 advertiser that owns the campaign |
| `cmCampaignId` | CM360 campaign id (linked or written back after create) |
| `startDate`, `endDate` | Campaign-level dates |
| `stage`, `status` | Shepherd state machine position |

### Child — `ActivationVariationCm`
`fundadata-alphix/src/FundadataAlphix/AiAssetBuilder/Model/ActivationVariationCm.ts`
Table: `ai_asset_builder_campaign_activation_variation_cm`

| Field | Role |
| --- | --- |
| `uuid` | Primary key |
| `activationUuid` | **Link to the parent activation** |
| `approvalUuid` | Link to the approved creative item |
| `placementName`, `adName` | Derived/supplied CM names |
| `siteId` | CM360 site the placement runs on |
| `placementStart`, `placementEnd` | **Per-placement dates** |
| `testingStart` | Optional placement testing start |
| `exitUrl` | Click destination |
| `cmPlacementId`, `cmAdId`, `cmCreativeId` | Written back by the shepob after CM creation |

**Cardinality:** `1 booking → 1 campaign → N placements (one per approved variation)`.

---

## 2. Linking a booking to placements

### Entry point
`asset-builder-service/src/Controller/Activation.ts` — `responsePost()`

The POST body carries `bookingUniqueNumber`, `cmAdvertiserId`, `campaignUuid`,
campaign dates, and a `variations[]` array. Each variation supplies `approvalUuid`,
`siteId`, `placementStart`, `placementEnd`, `exitUrl` (names optional — derived
server-side otherwise).

### Step 1 — Resolve any campaign the booking is already bound to
`asset-builder-service/src/Service/BookingCampaignLink.ts` — `resolveBookingCampaignLink()`

This looks across **two sources** and reconciles them:

1. **External placements** (trafficked by any process):
   `fundadata.google.campaignManager.placement.fetchByBookingUniqueNumber(...)`
   joins `di_ca_placements` (booking ↔ placement bridge) → `dc_placements` (CM data).
   Each placement carries the `campaignId` (and `advertiserId`) the booking runs under.
2. **Our activations:**
   `fundadata.aiAssetBuilder.activationCm.fetchByBookingUniqueNumber(...)` — any
   `ActivationCm` parents already created for the booking.

It collects the distinct CM campaign ids found. If exactly one, that is the linked
campaign; more than one sets `conflict: true` (a data anomaly).

### Step 2 — Enforce one booking → one campaign
`Activation.ts` (`responsePost`):

- `link.conflict` → fail `booking-linked-to-multiple-campaigns`.
- `link.campaignUuid` exists but differs from the request → fail
  `booking-bound-to-other-campaign`.
- Booking already has a CM campaign (`link.cmCampaignId`): creating a new one is
  rejected (`booking-already-linked-create-not-allowed`); a mismatched
  `cmCampaignId` is rejected; otherwise the existing id is **adopted** so repeat
  "add more creatives" runs reuse the same campaign.

### Step 3 — Validate the creatives
Every `approvalUuid` must exist, belong to `campaignUuid`, and be `APPROVED`.
Duplicates within the request are rejected.

### Step 4 — Build names, then write rows
Names are constructed **before any write** so a naming/uniqueness failure aborts
with no rows persisted. Then:

- One **parent** `ActivationCm` is saved with `bookingUniqueNumber`,
  `cmAdvertiserId`, `campaignUuid`, `cmCampaignId`, and campaign dates.
- One **child** `ActivationVariationCm` is saved per variation, linked via
  `activationUuid`, capturing `siteId`, dates, names, `exitUrl`, and a frozen
  snapshot of the approved creative (`htmlBucket`, `htmlPrefix`, `content`).

This is the linkage: **booking** (`bookingUniqueNumber` on parent) → **campaign**
(`campaignUuid`/`cmCampaignId` on parent) → **placements** (child rows keyed by
`activationUuid`, each with its own `siteId` + dates).

---

## 3. Placement dates

### Where they come from
Dates are **user-supplied in the POST body**, validated as `format: 'date'` strings:

- Campaign level: `startDate`, `endDate` (required).
- Placement level: `placementStart`, `placementEnd` (required per variation),
  `testingStart` (optional).

### How they are stored
`Activation.ts` converts the date strings to `Date` objects before assignment
(fundadata date fields reject raw strings):

- Parent: `parent.startDate.value = new Date(body.startDate)` /
  `parent.endDate.value = new Date(body.endDate)`.
- Child: `child.placementStart.value = new Date(v.placementStart)` /
  `child.placementEnd.value = new Date(v.placementEnd)`; `testingStart` only when
  present.

These are a **snapshot at activation time** — they are independent of, and do not
later re-sync with, the source booking.

> **Note / gap:** there is no business-rule validation that placement dates fall
> within the campaign date range. Schema-level date validation is the only check.

### How they feed naming
`asset-builder-service/src/Service/PlacementNaming.ts` injects the dates into the
naming context as `placement_date_start` / `placement_date_end` tokens (formatted
`dd/mm/yyyy`, UTC, via `formatPlacementDate` in `src/Helper/PlacementNaming.ts`).
If start == end, the end token is blanked. This lets an advertiser's placement-name
template embed the run dates (e.g. `Site_Targeting_01/06/2026_30/06/2026`).

### How they reach CM360
The managing shepob `shepob-doubleclick`
(`src/Service/Activation/Manager.js`) reads the dates straight off the child rows
and forwards them to CM360 via the `dc_job` placement params:

- `buildPlacementParams(...)`: `startDate: toDmy(child.placementStart.value)`,
  `endDate: toDmy(child.placementEnd.value)`, and `testingStartDate` when present.
- `buildCampaignParams(...)`: campaign dates converted the same way.
- `toDmy(...)` formats to `dd/mm/yyyy` (UTC) for the CM360 API.

So placement dates flow **unchanged except for formatting**: ISO string in the
request → `Date` in the DB child row → `dd/mm/yyyy` in the CM360 call.

---

## 4. End-to-end flow

```
POST /activation (bookingUniqueNumber, cmAdvertiserId, campaignUuid,
                  startDate/endDate, variations[ siteId, placementStart,
                  placementEnd, approvalUuid, ... ])
        │
        ▼
resolveBookingCampaignLink()  ── external placements (di_ca_placements→dc_placements)
        │                      └ our activations (activation_cm)
        ▼  enforce: one booking → one campaign
ActivationCm (parent)         ← booking link + campaign + campaign dates
ActivationVariationCm (N)     ← per-placement: siteId + placementStart/End (+testingStart)
        │
        ▼  (shepob-doubleclick ActivationManager state machine)
CM360:  campaign → placements → creatives → ads
        dates sent as dd/mm/yyyy; cmCampaignId/cmPlacementId/... written back
```

## Key references

| Concern | File |
| --- | --- |
| POST handler, linking, writes | `asset-builder-service/src/Controller/Activation.ts` |
| Booking ↔ campaign resolution | `asset-builder-service/src/Service/BookingCampaignLink.ts` |
| Placement name + date tokens | `asset-builder-service/src/Service/PlacementNaming.ts`, `src/Helper/PlacementNaming.ts` |
| Parent / child models | `fundadata-alphix/.../AiAssetBuilder/Model/ActivationCm.ts`, `ActivationVariationCm.ts` |
| CM360 propagation | `shepob-doubleclick/src/Service/Activation/Manager.js` |
