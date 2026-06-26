# Portal-node — Test Summary

**Repo:** `portal-node`
**Branch:** `feature/OA-Activate-Drilldown12181122321`
**Base:** `main/staging`

There are **three areas of change** on this branch. They are independent and can be tested separately.

---

## 1. Activate drilldown in Digital activity reporting (committed)

**What it does:** Adds a new `activate` section to the Digital activity reporting response. This surfaces the "Activate" (AI asset builder campaign variation) creatives in the drilldown — one row per trafficked creative that is linked to a campaign variation, enriched with the variation's **headline** and **channel**, plus a count of how many of its AMX line items are active.

**Files:**
- `src/Lookup/Activate/Variation.js` *(new)* — looks up AI asset builder campaign variations linked to CM creative IDs; extracts the headline from the variation content JSON (handles `headline`, and falls back to `headline_a` / `headline_b` etc.).
- `src/Lookup/Activate/LineItemStatus.js` *(new)* — resolves AMX line item details/status counts for CM creatives (creative → placement → AMX creative → line item chain).
- `src/Api/Client/Aggregator/Reporting/Activity/Digital.js` — populates `stats.activate`, with nested `sites` and `campaignSites` breakdowns, and total/active line item counts.

**What to test:**
- Open a Digital activity report for a client that uses Activate / AI asset builder creatives. Confirm an **Activate drilldown** appears and lists creatives.
- Each Activate row shows the correct **headline** and **channel**.
- The **line item status** count (active vs total) is correct for the creatives.
- Drilling into **sites** and **campaign sites** under an Activate creative shows the right stats/figures.
- A client/report with **no** Activate-linked creatives shows an empty Activate section (no errors, nothing breaks in the rest of the report).
- Sanity-check totals against the existing Creatives drilldown — Activate figures should reconcile with the underlying creative figures.

---

## 2. Booking data source migration: `ds_fm_bookings_data` → `di_booking_placement_link` (uncommitted)

**What it does:** Switches placement/booking lookups from the old `ds_fm_bookings_data` table to the new `di_api.di_booking_placement_link` table. Queries now filter on `source = 'tsf'`, exclude null placement unique numbers, and use `DISTINCT` to avoid duplicate rows from the new table shape. Click-tracker filtering changed from `tracker_data_selector = 'Click'` to the `isClickTracker = 1` flag.

**Files:**
- `src/Api/Client/Aggregator/Reporting/Activity/Overview.js`
- `src/Lookup/Analytics/Booking.js`
- `src/Lookup/Analytics/Link.js`
- `src/Lookup/Analytics/Placement.js`
- `src/Lookup/Analytics/TrafficLink.js`
- `src/Lookup/Client/Booking.js` *(booking start date now uses `MIN(placementDateStart)` grouped by placement)*
- `src/Lookup/Gcm/Traffic/Booking.js` *(click-tracker join)*
- `src/Lookup/Gcm/Traffic/Placement.js` *(click-tracker joins across 5 queries)*
- `src/Lookup/Tag/Reporting.js` *(BigQuery EXTERNAL_QUERY now reads the new table with `MIN(placementDateStart)` + GROUP BY)*

### How this is exercised (traced through portal-node routes → portal-vue screens)

Routing: portal-node registers every route in `src/Routes.js` via `add(METHOD, 'path', ...)`, prefixed with `/v2/`. portal-vue calls these through the `connect/api` wrapper. The migrated lookups feed the following API routes and UI screens.

| Changed file / function | API route (portal-node) | portal-vue screen |
|---|---|---|
| `Activity/Overview.js` (inline query) | `GET /v2/client/aggregator/reporting/activity/overview/:aaUuid` | Client Aggregator List — Outcome summary |
| `Analytics/Booking.js` → `findBookingPlacementCreativeDaily` | `GET /v2/client/aggregator/reporting/activity/digital/:aaUuid` | Outcome > Analytics > Digital |
| `Client/Booking.js` → `getBookingStartDate` (placement-exclude cache) | feeds **all** Digital / Tag-reporting routes below | all Digital + Deepdive + Engagement screens |
| `Gcm/Traffic/Placement.js` → `findBmDaily`, `findCreativeDaily`, `findDynamicDaily` | `GET /v2/client/aggregator/reporting/activity/digital/:aaUuid` | Outcome > Analytics > Digital |
| `Gcm/Traffic/Placement.js` → `findCreativeDaily` | `POST /v2/client/aggregator/reporting/activity/digital/event` | Digital drilldown — Event/Conversion side sheet |
| `Gcm/Traffic/Placement.js` → `findDaily` | `GET /v2/doubleclick/reporting/placement/aggregator/:placementId/:aaUuid` | Placement Deepdive — Performance tab |
| `Gcm/Traffic/Placement.js` → `findDeviceDaily` | `GET /v2/doubleclick/reporting/placement/device/:placementId` | Placement Deepdive — Performance tab (Device) |
| `Tag/Reporting.js` → `reportByPlacementId` | `GET .../activity/digital/:aaUuid` + `GET .../placement/aggregator/:placementId/:aaUuid` | Outcome > Analytics > Digital; Placement Deepdive |
| `Tag/Reporting.js` → `reportDeviceByPlacementId` | `GET /v2/doubleclick/reporting/placement/device/:placementId` | Placement Deepdive — Performance tab |

### Detailed test plan

There are **6 distinct API endpoints** affected, reachable through **3 UI screens** plus **2 API-only endpoints**. Each distinct endpoint is listed once below, so nothing is tested twice.

**Golden rule for every test:** the migration should produce **identical output** to before — same placements, same figures, no extra/missing rows. The most reliable check is to run the **same client + same date range** on this branch (staging) and on **production** (still old code) and compare side by side.

#### What these screens actually do (so you know what you're checking)

All of these screens **overlay the booked media plan onto the actual delivered data**. The changed table (`di_booking_placement_link`) is the lookup that **links a CM/ad-server placement to its booking** (via `placementUniqueNumber`, the booking reference). Almost everything downstream depends on that link being correct:

- **Booking ↔ placement matching** — does each delivered placement get tied to the right booking line? If the link breaks, placements show as **unbooked / missing / unmatched**, or get tied to the wrong booking.
- **Planned vs actual figures** — booked impressions/budget shown next to actual impressions/clicks/spend, plus pacing/delivery %. Broken links make planned columns go **blank, zero, or wrong**.
- **Placement exclusions** — excluded placements are resolved through this same link; if it breaks, excluded placements **reappear** and inflate totals.
- **Click-tracker handling** — the `isClickTracker = 1` flag (replacing `tracker_data_selector = 'Click'`) decides which placements are click trackers; getting it wrong **mis-attributes or double-counts clicks/impressions**.
- **Campaign/booking start dates** — `getBookingStartDate` now returns `MIN(placementDateStart)` per placement; a wrong date shifts what falls inside the report's date range.

#### The five symptoms to actively hunt for on every screen

1. **Missing rows / placements** — a placement that appears in production is absent here (caused by the new `source = 'tsf'` and `placementUniqueNumber IS NOT NULL` filters being too strict, or the new table not yet populated for that placement).
2. **Duplicated rows / inflated totals** — the same placement listed twice, or figures roughly doubled (the new table can have multiple link rows per placement; `DISTINCT`/`MIN` are meant to collapse them — check they did).
3. **Unbooked / "missing booking" placements** — delivery data that no longer matches to a booking (look for a "missing placements/bookings" warning, an unmatched bucket, or planned columns going blank).
4. **Wrong click-tracker attribution** — click-tracker placements either contributing impressions they shouldn't, or click data disappearing.
5. **Figure drift** — totals that are *close* to production but not equal (impressions, clicks, spend, CTR, CPM, conversions). Small unexplained differences are the most likely and easiest-to-miss failure mode — compare exact numbers, not just "looks about right".

> **Dedup note:** The **Report Builder** screen (`/report/build/...`) calls only `client/aggregator/reporting/activity/digital/:aaUuid` — the *same* endpoint as the Outcome > Analytics > Digital screen (verified in `Report/Build.vue`). It is therefore **covered by Test A below and does not need separate testing**. (Optional: a 1-minute smoke test that a built report still renders.)

---

#### Test A — Outcome > Analytics > Digital  *(covers the most endpoints)*
**Covers endpoints:** `GET .../activity/digital/:aaUuid`, `POST .../activity/digital/event`, `POST .../alphix/engagement/:aaUuid`
**Covers changed code:** `Analytics/Booking.js`, `Gcm/Traffic/Placement.js` (findBmDaily/findCreativeDaily/findDynamicDaily), `Tag/Reporting.js` (reportByPlacementId), `Client/Booking.js` (getBookingStartDate)

**Steps:**
1. Open a client → **Client > Aggregator list** (`/client/aggregator/list/:clientUuid?`) → open a campaign's digital analytics → **Outcome > Analytics > Digital** (`/outcome/analytics/digital/:id`).
2. Check the main drilldown tables — **site, placement, creative, dynamic**.
3. Click an event/conversion to open the **Event / Conversion side sheet**.
4. Open the **Landing Page engagement table** in the drilldown.
5. Repeat on a campaign that has **placement exclusions** (`cm_placementExclude` setting) configured.

**What you're looking for (compare every point against production, same campaign + dates):**
- **Same set of placements** appears — no placement present in production is missing here, and none appears twice. Row counts match.
- **Every placement is matched to its booking** — no placements drop into an "unbooked"/"missing placement" state that weren't already there in production. Planned/booked columns (booked impressions, budget) are populated, not blank or zero.
- **Actual figures match exactly** — impressions, clicks, spend, CTR, CPM, conversions per placement/creative and in the totals row. These come from CM/DV360/AMX but are *attributed via the booking link*, so a broken link shows up as wrong or missing numbers.
- **Click-tracker placements** behave as in production — they should not be inflating impression counts; click data still attributes to the right placement.
- **Event side sheet** and **Landing Page engagement table** load without error and their figures reconcile with the parent drilldown.
- **Exclusions actually exclude** — on the campaign with `cm_placementExclude` set, the excluded placements must NOT appear in the tables or totals. If a previously-excluded placement reappears, the exclusion lookup has broken.
- **Booking start date** is the earliest start date per placement (campaign/placement "start" shown is correct, and the date range of data pulled looks right — not shifted).

#### Test B — Placement Deepdive — Performance tab
**Covers endpoints:** `GET /v2/doubleclick/reporting/placement/aggregator/:placementId/:aaUuid`, `GET /v2/doubleclick/reporting/placement/device/:placementId`
**Covers changed code:** `Gcm/Traffic/Placement.js` (findDaily, findDeviceDaily), `Tag/Reporting.js` (reportByPlacementId, reportDeviceByPlacementId)

**Steps:**
1. From the Digital drilldown (Test A), click a placement to open the **Placement Deepdive** (also reachable via **Troubleshooter > Aggregator**, `/troubleshooter/aggregator/:aaUuid?`).
2. Open the **Performance** tab.
3. Open the **Device** breakdown.
4. Repeat for at least one **click-tracker placement**.

**What you're looking for (compare against production for the same placement + dates):**
- **Daily figures line up day-by-day** — the per-day impressions/clicks/spend on the Performance tab match production exactly, with the same number of days and no gaps or duplicated days.
- **Booking/plan data is present** — the deepdive ties the placement to its booking; planned/booked values and any "bookings" indicator should still show, not turn blank.
- **Device breakdown reconciles** — the device split totals back up to the placement total, and matches production.
- **Click-tracker placement is the key case** — for a placement that is a click tracker, confirm clicks are still recorded and attributed, and it isn't suddenly being treated as a normal impression-serving placement (or vice versa). This is the direct test of the `isClickTracker = 1` change.
- **No "placement not found / no data"** where production shows data — that would indicate the placement→booking link didn't resolve from the new table.

#### Test C — Client Aggregator List — Outcome summary
**Covers endpoint:** `GET /v2/client/aggregator/reporting/activity/overview/:aaUuid`
**Covers changed code:** `Activity/Overview.js` (inline placement-exclusion query)

**Steps:**
1. Go to **Client > Aggregator list** (`/client/aggregator/list/:clientUuid?`).
2. Look at the per-campaign **Outcome** summary card/column.
3. Use a client **with placement exclusions** configured.

**What you're looking for (compare against production):**
- **Outcome/summary figures per campaign match** production exactly — this is an aggregated roll-up, so a broken link or exclusion shows up as the headline number being slightly off.
- **Exclusions are honoured at the summary level** — excluded placements must not be contributing to the outcome totals. If the headline number jumps up versus production, an excluded placement has leaked back in.
- **No campaigns showing zero/blank** outcome where production shows figures (would indicate the booking link failed to resolve).

---
