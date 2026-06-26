# Usage Report: `di_api.ds_fm_bookings_data`

_Generated 2026-06-19 — full scan of all FundamentalMedia GitHub repositories (local clones + org code search)._

> **Naming note.** The request named `di_api.ds_fm_bookings`. **No table called `ds_fm_bookings` exists.** The only matching physical table is **`di_api.ds_fm_bookings_data`** (40 source references, all to this exact name). This report covers that table. (There is a separate, unrelated `di_api.ds_bookings` table — the booking header — which this table joins to via `bookingUniqueNumber`; it is out of scope.)

---

## 1. What the table is

`di_api.ds_fm_bookings_data` is a **placement-level trafficking / booking dimension** table. Each row maps a FileMaker-sourced media booking and its placement to a DoubleClick / Campaign-Manager (CM360) `placementId`, carrying booked dates, quantities, cost, product metadata, and a tracker selector. It is the bridge between FileMaker booking data, CM360 reporting data, and the portal/Alphix reporting pipelines.

### Authoritative schema
Source: `demo-data/schemas/server1.di_api.ds.schema`

| Column | Type | Key / Notes |
|---|---|---|
| `id` | int unsigned NOT NULL AI | **PK** |
| `uuid` | varchar(255) | **Unique key** |
| `placementUniqueNumber` | varchar(255) | **Unique key** (= FileMaker record id) |
| `bookingUniqueNumber` | varchar(255) | → joins `di_api.ds_bookings` |
| `tsfCurrentAccountId` | varchar(255) | FileMaker current-account id |
| `tsfCampaignsId` | varchar(255) | FileMaker campaign id |
| `campaignId` | int unsigned | CM360 campaign id |
| `placementId` | int unsigned | CM360 placement id (primary join key everywhere) |
| `placementSize` | varchar(20) | |
| `placementDateStart` | date NOT NULL | booking window start (test-data exclusion) |
| `placementDateEnd` | date NOT NULL | booking window end |
| `impressions` | bigint unsigned | |
| `bookedQuantity` | bigint unsigned | |
| `bookedTotalCost` | double | |
| `traffickingString` | varchar(511) | |
| `pricingType` | varchar(50) | |
| `product` | varchar(50) | |
| `managementStyle` | varchar(50) | |
| `costStructure` | varchar(50) | e.g. `'Click Tracker'` |
| `assetClass` | varchar(50) | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |
| `placement_name_short` | varchar(255) | |
| `tracker_data_selector` | varchar(255) | `'Click'` ⇒ click-tracker placement |
| `createdHost` | datetime | |
| `modifiedHost` | datetime | incremental-sync high-water mark |

---

## 2. Data flow at a glance

```
FileMaker (layout "TsfBookingData")
        │  shepob-filemaker / ImportBooking.js   (ONLY writer — UPSERT on uuid, incremental by modifiedHost)
        ▼
┌───────────────────────────────────────────────────────────┐
│            di_api.ds_fm_bookings_data                       │
└───────────────────────────────────────────────────────────┘
  │ placementId / uuid / bookingUniqueNumber / modifiedHost / placementDateStart / tracker_data_selector ...
  │
  ├─ shepob-intell/BookingPlacement.js ........ builds & reconciles portal_production.di_ca_placements (uuid → tsfUuid)
  ├─ shepob-doubleclick/Report.js ............. sets report excludeCode (rows before placementDateStart → 5)
  ├─ shepob-doubleclick/Cost/BookingUpdated.js  re-triggers cost recalc when modifiedHost changes
  ├─ shepob-doubleclick/Populate…/Helper ...... click-tracker flag + modified-placement detection → dc_reports_data_placement_creative_url
  ├─ shepob-troubleshooter/InvalidUrl.js ...... validates landing-page CA tags vs placementUniqueNumber
  ├─ portal-node (legacy) ..................... analytics placementId↔placementUniqueNumber mapping, click-tracker exclusion, start-date exclusion
  ├─ alphix-app-node/Lookup/Analytics/TrafficLink.js  (verbatim copy of portal-node) analytics traffic-link name/id resolution
  └─ fundadata ORM models (3 packages) ........ typed access used by Alphix + reporting-media report pipelines
```

**Only one writer exists** (`shepob-filemaker/ImportBooking.js`). Every other usage is read-only.

---

## 3. The writer (ingest)

### `shepob-filemaker/src/Command/ImportBooking.js` — **WRITE (UPSERT)**
- **Source:** FileMaker layout **`TsfBookingData`** (`FilemakerClient.listLayoutWithFind('TsfBookingData', …)`, `:118`).
- **Operation:** `sql.insertUpdate('di_api.ds_fm_bookings_data', insertData, updateData)` (`:191`) — UPSERT keyed on the `uuid` unique key. On conflict only `updateData` is applied (`uuid`/`created_at` preserved, `updated_at` refreshed).
- **Columns written (insert/update payload, `:143-187`):** `createdHost`, `modifiedHost`, `bookingUniqueNumber`, `tsfCurrentAccountId`, `tsfCampaignsId`, `campaignId`, `placementId`, `placementSize`, `impressions`, `traffickingString`, `placement_name_short`, `pricingType`, `product`, `managementStyle`, `costStructure`, `assetClass`, `placementDateStart`, `placementDateEnd`, `bookedQuantity`, `bookedTotalCost`, `placementUniqueNumber`, `tracker_data_selector`, `updated_at`; insert-only: `uuid`, `created_at`.
- **FileMaker → column mapping (highlights):** `doubleClick_PlacementId`→`placementId`; `TsfPlacements_CurrentAccounts::Booking Unique Number`→`bookingUniqueNumber`; `fileMaker_record_id`→`placementUniqueNumber`; `bookedProduct/ManagementStyle/CostStructure/AssetClass`→`product`/`managementStyle`/`costStructure`/`assetClass`; dates default to `'1999-09-09'` if missing; `bookedQuantity` = `totalImpressions_TsfParentBooking * 1000`; `bookedTotalCost` coerced to `0` when missing or `'?'`.
- **Incremental sync:** `latestLookup('ds_fm_bookings_data', 'modifiedHost')` (`:116`) returns `MAX(modifiedHost)` (seed `'01/08/2025'` if empty); FileMaker find filters `modifiedHost >= latest` ascending — high-water-mark sync.
- **Derived write (same job):** after upsert, `INSERT IGNORE INTO dc_sites_link_ds_bookings` from `ds_fm_bookings_data fbd` ⨝ `dc_placements` ⨝ `ds_bookings`, grouping `siteId, mediaName`, concatenating `fbd.uuid` — auto-creates site↔booking links (`:196-202`).

---

## 4. Background-job readers (`shepob-*`)

| File | Op | Columns used | Purpose / downstream |
|---|---|---|---|
| `shepob-intell/src/Command/BookingPlacement.js` | READ ×2 | `placementId`, `uuid`, `tsfCurrentAccountId` | **Builds & reconciles `portal_production.di_ca_placements`.** Insert: `dc_placements` ⨝ `ds_fm_bookings_data` (on `placementId`) ⨝ `ds_bookings_related` (on `tsfCurrentAccountId = uuid`), inserting `(placementId, tsfUuid=uuid, bookingUniqueNumber)` where not already linked (`:6-26`). Delete: removes `di_ca_placements` rows whose backing `uuid`/booking link disappeared (`:30-46`). This link table is the join the rest of the platform relies on. |
| `shepob-doubleclick/src/Doubleclick/Report.js` | READ (UPDATE…JOIN) | `placementId`, `placementDateStart` | In `postTableImport`: `UPDATE <reportTable> rd LEFT JOIN ds_fm_bookings_data dfbd ON rd.placementId=dfbd.placementId SET rd.excludeCode = IF(dfbd.placementDateStart IS NULL OR rd.date>=dfbd.placementDateStart, 0, 5)` over last 730 days (`:495-499`). **Flags report rows dated before the booking start as `excludeCode=5`** (test data), filtered out downstream. |
| `shepob-doubleclick/src/Command/Cost/BookingUpdated.js` | READ (LEFT JOIN) | `bookingUniqueNumber`, `modifiedHost` | Change-detection: `dfbd.modifiedHost > DATE_SUB(dbp.costProcessed, INTERVAL 1 DAY)` (`:13`) re-triggers `processCost()` for that booking. |
| `shepob-doubleclick/src/Command/PopulateModifiedPlacementCreativeDateUrl.js` | READ | `placementId`, `modifiedHost` | `SELECT DISTINCT placementId WHERE modifiedHost >= ? AND placementId IS NOT NULL` (`:22-29`) → set of changed placements whose `dc_reports_data_placement_creative_url` rows get recomputed. |
| `shepob-doubleclick/src/Helper/PlacementCreativeDateUrl.js` | READ (subquery) | `placementId`, `tracker_data_selector` | `SELECT placementId … WHERE tracker_data_selector='Click' AND placementId>0` (`:548-552`), left-joined to flag `track_click` per report row → carried into `dc_reports_data_placement_creative_url`. |
| `shepob-troubleshooter/src/Command/InvalidUrl.js` | READ (LEFT JOIN) | `placementId`, `placementUniqueNumber` | Supplies the expected `placementUniqueNumber` for a landing page (`:70`); URL CA-tag parsed and compared — mismatch sets `wrongPlacementId` flag, written to `dc_placement_landing_page.error_code`. |

---

## 5. Application / legacy raw-SQL readers

All read-only. Three recurring semantic uses: **(a)** `placementId`↔`placementUniqueNumber` translation, **(b)** click-tracker exclusion (`tracker_data_selector='Click'`), **(c)** test-data exclusion via `placementDateStart`.

| File | Op | Columns used | Purpose |
|---|---|---|---|
| `alphix-app-node/src/Lookup/Analytics/TrafficLink.js` | READ | `placementId`, `placementUniqueNumber` (+ joined `dc_placements.name`) | `mapLinks()` (`:76-80`) resolves placement name + canonical `placementId` onto analytics traffic-link rows (`cm~<placementId>~<bookingUniqueNumber>`). **⚠ Byte-identical copy of the portal-node file** — lifted verbatim, not rebuilt on fundadata. |
| `portal-node/src/Lookup/Analytics/TrafficLink.js` | READ | `placementId`, `placementUniqueNumber` | Same as above (legacy original). |
| `portal-node/src/Lookup/Analytics/Booking.js` | READ ×3 | `placementUniqueNumber`, `placementId` | Builds `placementUniqueNumber→placementId` map to rewrite analytics rows (`ga_booking`, `aa_report_booking`, `ga_v4_report_booking`, `piwik`, `piano`) onto canonical CM placementId; also expands exclude-placement lists (`:22-25, 50-54, 92-95, 131-136`). |
| `portal-node/src/Lookup/Analytics/Link.js` | READ | `placementUniqueNumber`, `placementId` | `findPlacementUnique()` (`:50-53`) id-pair lookup for analytics-row matching. |
| `portal-node/src/Lookup/Gcm/Traffic/Booking.js` | READ ×5 | `placementId`, `tracker_data_selector` | `trackClick` derived subquery LEFT JOINed onto `dc_reports_data_*`; **excludes click-tracker placements from impression/cost sums** while counting their clicks as `standAloneClicks`. |
| `portal-node/src/Lookup/Gcm/Traffic/Placement.js` | READ ×5 | `placementId`, `tracker_data_selector` | Same click-tracker exclusion across daily/creative/device/dynamic traffic reports. |
| `portal-node/src/Lookup/Client/Booking.js` | READ | `placementId`, `placementDateStart` | `getBookingStartDate()` (`:83-87`) — per-placement start date used for test-data exclusion. |
| `portal-node/src/Lookup/Tag/Reporting.js` | READ (BigQuery `EXTERNAL_QUERY`) | `placementId`, `bookingUniqueNumber`, `placementDateStart` | Federated query from BigQuery into live MySQL, joined to delta-tag tables (`page_log_cm`, `page_log_cm_device`); `placementDateStart` gates `campaignEntrances` (only entrances on/after start count) (`:38-41, 57-62, 101-104, 120-125`). |
| `portal-vue/src/views/Home.vue` | — (comment only) | `placementId`, `placementDateStart` | Changelog string (`:248`) documenting the business rule: *exclude all data before `placementDateStart` (joined by `placementId`) — "only start date matters"*. No query. |

**Legacy status:** all `portal-node`/`portal-vue` usages are legacy (per repo CLAUDE.md). `alphix-app-node`'s `TrafficLink.js` is a verbatim port of the portal-node file and is the live main-stack path; it has **not** been migrated to fundadata even though a typed model now exists (§6). All raw-SQL usages are migration candidates.

---

## 6. Fundadata ORM layer

The physical table is modeled **three times** across three packages, with **identical 26-column sets** but **divergent options**. All three carry a placeholder `FundadataGuardPublic` guard with a literal `// TODO - ADD GUARD RULES` comment — **no real authorization in any package**.

| Package | Model class | Repo | Status |
|---|---|---|---|
| `fundadata-alphix` | `ModelIntellCampaignManagerPlacement` | `RepoIntellCampaignManagerPlacement` | **Live** (Alphix reporting) |
| `fundadata-intell` | `ModelIntellTsfBooking` | `RepoIntellTsfBooking` | **Live** (reporting-media) |
| `fundadata-campaign-manager` | `ModelCampaignManagerFmBookingsData` | `RepoCampaignManagerFmBookingsData` | **Dead** — unexported, zero consumers |

### Model definition divergences (same physical table!)
| Aspect | alphix `Placement` | intell `TsfBooking` | campaign-manager `FmBookingsData` |
|---|---|---|---|
| Primary key | `id` only | composite `(id, uuid, placementUniqueNumber)` | composite `(id, uuid, placementUniqueNumber)` |
| Nullability | almost all `allowNull: true` | none nullable | none nullable |
| `traffickingString` maxLen | **511** ✅ (matches DB) | 255 | 255 |
| `bookedTotalCost` | unbounded | **`maxValue: 99`** (bogus money cap) | unbounded |
| `bookingUniqueNumber` link | none | → `LinkIntellBookingUniqueNumber` → `ds_bookings` ✅ | none |

> **Reconciliation against the real schema (§1):** the DB has `id` as PK and `uuid`/`placementUniqueNumber` as *unique keys* (not a composite PK). The alphix `id`-only PK matches the physical PK; the intell/campaign-manager "composite PK" conflate unique keys with the PK. The alphix `traffickingString(511)` matches the DB; the other two truncate to 255. The `maxValue: 99` cap on `bookedTotalCost` in intell is incorrect for a `double` money column. These are model-definition bugs worth flagging.

### Fields declared (all three list the same 26 columns)
`id`, `uuid`, `bookingUniqueNumber`, `tsfCurrentAccountId`, `tsfCampaignsId`, `campaignId`, `placementId`, `placementSize`, `placementDateStart`, `placementDateEnd`, `impressions`, `bookedQuantity`, `bookedTotalCost`, `traffickingString`, `pricingType`, `product`, `managementStyle`, `costStructure`, `assetClass`, `created_at`, `updated_at`, `placementUniqueNumber`, `placement_name_short`, `tracker_data_selector`, `createdHost`, `modifiedHost`.

### ORM consumers
- **`fundadata-alphix` `Placement`** (exposed as `fundadata.intell.campaignManager.placement`):
  - `Reporting/CampaignInsight/Display/ExcludeCode.ts:89-100` — `search().by(placementId, ids).fetch()` → `{placementId → placementDateStart}` map for exclude-code 5 (drop rows before placement start).
  - `Reporting/Media/Alphix/Url.ts:194-209` (`_filterOutOfRangePlacements`) — custom select of `placementId`, `costStructure`, `placementDateStart` filtered by `placementId IN (...)`; identifies `costStructure='Click Tracker'` placements + start dates to exclude out-of-window landing-page report rows.
- **`fundadata-intell` `TsfBooking`** (repo methods `fetchBy`, `fetchByPrimaryKey`, `fetchByPlacementId`):
  - `fundadata-reporting-media .../Digital/Base.ts:47` (`_applyClickTrackerPlacementCorrection`) — `fetchByPlacementId(list)`, reads `tracker_data_selector`+`placementId`; for `tracker_data_selector==='Click'` zeroes impressions/measurable/viewable, moves clicks→`standAloneClicks`, cost→`costClickGbp`.
  - `fundadata-reporting-media .../Digital/Transform/ExcludeCode.ts:84` — `fetchBy({placementId},{requestedField:['placementId','placementDateStart']})` → exclude-code 5 map.
  - `fundadata-reporting-media .../Digital/Base.ts` also references the table **in a comment only** (business-rule note), not a query.
- **`fundadata-campaign-manager` `FmBookingsData`** — modeled but **never consumed or exported** (dead scaffold).

---

## 7. Columns by usage frequency

| Column | Where used | Why |
|---|---|---|
| `placementId` | almost every reader (join key) | canonical CM360 placement join |
| `placementUniqueNumber` | analytics lookups, troubleshooter, ORM | analytics "unique number" ↔ placementId translation; URL CA-tag validation |
| `placementDateStart` | Report.js, Client/Booking, Tag/Reporting, both ORM exclude-code paths | test-data exclusion ("only start date matters") |
| `tracker_data_selector` | doubleclick Helper, portal GCM traffic ×2, reporting-media Base | click-tracker exclusion / metric correction |
| `bookingUniqueNumber` | Cost/BookingUpdated, intell BookingPlacement, Tag/Reporting, intell ORM link | join to `ds_bookings`, cost reprocessing |
| `modifiedHost` | filemaker importer, Cost/BookingUpdated, PopulateModified… | incremental sync + change detection |
| `uuid` | filemaker (UPSERT key), intell BookingPlacement (→`di_ca_placements.tsfUuid`) | row identity / link key |
| `tsfCurrentAccountId` | intell BookingPlacement | join to `ds_bookings_related` |
| `costStructure` | reporting-media / Alphix Url ORM | `'Click Tracker'` detection |
| written-only (filemaker) | `tsfCampaignsId`, `campaignId`, `placementSize`, `impressions`, `bookedQuantity`, `bookedTotalCost`, `traffickingString`, `pricingType`, `product`, `managementStyle`, `assetClass`, `placement_name_short`, `placementDateEnd`, `createdHost`, `created_at`, `updated_at` | populated on ingest; not read by any analyzed query |

---

## 8. Repos scanned

**Hits (analyzed):** `shepob-filemaker`, `shepob-intell`, `shepob-doubleclick`, `shepob-troubleshooter`, `alphix-app-node`, `portal-node`, `portal-vue`, `fundadata-alphix`, `fundadata-intell`*, `fundadata-campaign-manager`*, `fundadata-reporting-media`*, `demo-data` (schema source).
\* not cloned locally — cloned from GitHub for this analysis (`fundamentalandrew` / `FundamentalMedia` org).

**Method:** local `grep` across ~160 repo clones in `/Users/andrew/Code` + `gh search code` org-wide (`FundamentalMedia`). All matches reconcile between the two; no additional repos surfaced. Build/`dist` artifacts (e.g. `alphix-app-node/src/dist/**`, `portal-vue/dist/**`, `fundadata-alphix/demo/api/build/**`) were excluded as they mirror analyzed source.

---

## 9. Key findings & risks

1. **Single writer, well-bounded ingest.** Only `shepob-filemaker/ImportBooking.js` writes the table, via incremental FileMaker sync (UPSERT on `uuid`, high-water-mark on `modifiedHost`). Good idempotency.
2. **Three competing ORM models of one physical table**, with conflicting PK, nullability, length, value-cap, and link contracts. The `fundadata-intell` `bookedTotalCost maxValue:99` and the 255-char `traffickingString` (DB allows 511) are concrete model bugs. The `fundadata-campaign-manager` model is dead code.
3. **No guard anywhere** — all three models are `FundadataGuardPublic` with a TODO. The table is effectively unauthorized in the ORM layer.
4. **Verbatim raw-SQL carry-over into the modern stack.** `alphix-app-node/Lookup/Analytics/TrafficLink.js` is a byte-identical copy of legacy `portal-node`, despite a typed fundadata model (`ModelIntellCampaignManagerPlacement`) already existing. Prime migration candidate.
5. **Consistent business semantics** across legacy SQL and fundadata: (a) placementId↔placementUniqueNumber translation, (b) click-tracker exclusion via `tracker_data_selector='Click'`, (c) pre-`placementDateStart` test-data exclusion. Any migration must preserve all three.
