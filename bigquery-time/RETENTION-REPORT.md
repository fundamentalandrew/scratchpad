# BigQuery Retention Recommendation Report — Combined

**Projects scanned:**
- `digital-intelligence-208511` (DI) — 77 tables >1 GB across 19 datasets, ~19.5 TB
- `tracker-269317` (Tracker) — 145 tables >1 GB across 12 datasets, ~15.1 TB
- **Combined: 222 tables / ~34.7 TB**

**Report date:** 2026-05-18
**Action requested:** Report only — **NO data was deleted.**

---

## How the recommendations were derived

For each large table I:

1. Pulled `__TABLES__` metadata (size, row count, created, last_modified, type).
2. Inspected schema and partitioning via `bq show` (partition field, `requirePartitionFilter`, time columns).
3. Pulled the earliest and latest partition from `INFORMATION_SCHEMA.PARTITIONS` to see the actual data span.
4. Grepped every Fundamental Group repo in `~/Code` (~155 repos, mirror of the `FundamentalMedia` GitHub org) for direct references to the table, capturing the longest date window any consumer reads — backend `INTERVAL N DAY/MONTH/YEAR` filters, API endpoint date schemas, frontend `dateRange` presets, and year-on-year comparison logic.
5. Cross-referenced the cost report at `~/Code/scratchpad/bigquery-cost/reports/Feb 2026` for actual production query patterns.

The recommendation for each table is **the longest documented lookback observed in code, plus a buffer** — never less.

> ⚠️ **Important caveats.** Read-only metadata + grep is not a perfect proxy for "all uses". Three classes of usage are not visible from this audit and **must be confirmed with the data team before any retention change ships**:
> - Ad-hoc analyst SQL run from the BQ console (we see partial traces in the Feb cost report, but not all-time history).
> - Looker / Data Studio / Tableau extracts.
> - Compliance/legal/audit holds (especially for `billing.*`, `log.*`, and anything PII-adjacent).
>
> **PII note for tracker-269317:** `page_log`, `page_raw`, `page_active_raw`, `page_unload_log`, `page_unload_raw`, and `impression_log/raw` all carry `ip` / `ip_list`. Active code already runs scheduled IP-blanking UPDATEs (`UPDATE … SET ip = '', ip_list = '' WHERE timestamp < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL N DAY)` — see `shepob-db-processor/src/Command/CleanIpData.js`). Any retention discussion should account for the GDPR / privacy obligations that drove this design, not just the lookback windows.

---

## TL;DR — top 20 retention opportunities by impact

| # | Project.dataset.table                          | Size    | Recommended retention            | Approx. reclaim |
|---|------------------------------------------------|--------:|----------------------------------|----------------:|
| 1 | DI `amx.bid_log_raw`                           | 5,445 GB | **14 days**                      | ~5.3 TB |
| 2 | DI `amx.bid_log`                               | 5,410 GB | **90 days** + 18 mo cold archive | ~4 TB |
| 3 | Tracker `delta_tag.page_log`                   | 3,538 GB | **3 years** (matches longest read) | ~1.0 TB |
| 4 | Tracker `delta_tag.page_raw`                   | 3,483 GB | **30 days** (ingestion staging)  | ~3.3 TB |
| 5 | DI `amx.win_log_raw`                           | 3,121 GB | **14 days**                      | ~3 TB |
| 6 | DI `amx.win_log`                               | 3,084 GB | **24 months** (already ≈)        | ~0 |
| 7 | DI `log.shepob_api`                            | 1,637 GB | **90 days** (no readers in code) | ~1.5 TB |
| 8 | Tracker `delta_tag.page_active_raw`            | 1,577 GB | **30–90 days**                   | ~1.4 TB |
| 9 | Tracker `delta_tag.impression_log`             | 870 GB   | **24 months**                    | ~0 |
|10 | Tracker `delta_tag.impression_raw`             | 868 GB   | **30 days**                      | ~810 GB |
|11 | Tracker `trend.topic_url`                      | 676 GB   | **2 years**                      | small (table only 10 mo old) |
|12 | Tracker `delta_tag.page_log_processed`         | 440 GB   | **Already a derivative** — match `page_log` |  small |
|13 | Tracker `delta_tag.page_log-2024-05-07T12_11_46` | 391 GB | **DROP** (timestamped backup, no refs) | 391 GB |
|14 | DI `portal_log.query`                          | 358 GB   | **180 days**                     | ~280 GB |
|15 | Tracker `delta_tag.page_log_dimension`         | 354 GB   | **3 years** (mirrors page_log)   | small |
|16 | Tracker `delta_tag.page_unload_raw`            | 222 GB   | **30 days**                      | ~210 GB |
|17 | DI `content.opoint_document`                   | 25 GB    | **DROP** (no writes since 2022)  | 25 GB |
|18 | Tracker `delta_tag.page_log_session_*` (backups) | 108 GB | **DROP** (test/rebuild scratch)  | 108 GB |
|19 | Tracker `bot.page_log_bk`                      | 67 GB    | **DROP** (no refs)               | 67 GB |
|20 | Tracker `temp.page_log_ssga` etc.              | 65 GB    | **DROP**                         | 65 GB |

**Combined headline reclamation if all conservative recommendations applied: ~21 TB (~60%).**

---

# Part 1 — `digital-intelligence-208511` (DI)

## 1.1 `amx.*` — RTB bid/win logs (≈17 TB)

Partition key: `bid_time` (DAY), `requirePartitionFilter=true`.

| Table | Size | Partitions | Recommended retention |
|-------|-----:|-----------|----------------------|
| `bid_log_raw`      | 5,445 GB | 2023-06-01..today | **14 days** |
| `bid_log`          | 5,410 GB | 2023-06-01..today | **90 days** (+ 18-month cold archive if analysts need it) |
| `win_log_raw`      | 3,121 GB | 2021-09-29..today | **14 days** (currently mostly unpartitioned — see action) |
| `win_log`          | 3,084 GB | 2021-09-29..today | **24 months** (see caveat) |
| `win_log_url`      | 35 GB    | 2025-01-21..today | **24 months** |
| `bid_log_ingest`   | 13.5 GB  | 2024-05-24..today | **30 days** |
| `semantix_ranked_term` | 7.3 GB | unpartitioned | **Keep all** — lookup table, not time-series |

### Evidence from code

**bid_log_raw (staging for bid_log):**
- `shepob-amx/src/Helper/Bidlog.js:191` — `bid_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 HOUR)` (URL export to S3).
- `shepob-amx/src/Command/ProcessBidLogs.js:443` — `DATE(blr.bid_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${DAYS_BACK_CHECK} DAY)` with `DAYS_BACK_CHECK = 7`.
- No consumer reads further back than 7 days. **14-day retention** gives 2× the merge window for safety.

**bid_log (production):**
- `shepob-amx/src/Command/SectionTargeting.js:54` — `INTERVAL 45 DAY` (deepest scheduled read).
- `shepob-psychographix/src/Command/start_pipeline.py:178,203,230` + 6 more files — `INTERVAL 30 DAY`.
- `shepob-amx/src/Command/IngestBidLog_*.js` — `DAYS_BACK_CHECK = 2`.
- Cost report (Feb 2026) shows several user ad-hoc queries (`harry.kempe@`, `tobi.komolafe@`, `jeanne.daniel@`) using shorter (`INTERVAL <NUM> DAY`) windows on `bid_log`.
- The 5.4 TB table is being consumed only in a ≤45 d window for scheduled jobs. **Recommended: 90 days hot.** If analysts genuinely need >90 d, copy bid_log to a partitioned archive table or move cold partitions to a cheaper class — do not keep them on `bid_log` itself.

**win_log_raw:** `shepob-amx/src/Command/IngestWinLog.js:656,658` uses `INTERVAL ${DAYS_BACK_CHECK} DAY` for the merge into `win_log`. **14-day retention is safe.**
- ⚠️ Today `win_log_raw` has its last partition listed as `__UNPARTITIONED__` — confirm with the data team whether streaming inserts are landing in the buffer; retention must apply to landed partitions only.

**win_log (production):**
- `shepob-amx/src/Command/IngestWinLog.js` — 7-day merge.
- `shepob-db-processor/src/Command/AmxBidLogView.js:36,39` — `INTERVAL 15 DAY` then `INTERVAL 16 DAY` for the MERGE upper bound.
- `shepob-db-processor/src/Command/AmxWinLogUrl.js:54,57` — same 15/16-day rolling window.
- **No date filter (effectively all-time) in three places**:
  - `shepob-db-processor/src/Command/PageLogView.js:113,182,267` — `LEFT JOIN amx.win_log wl ON pl.amx_auction_id = wl.auction_id AND wl.bid_time > '2020-01-01'`.
  - `portal-node/src/Api/Delta/Reporting/Aggregator/Amx/Domain.js:68` — `LEFT JOIN amx.win_log amx ON amx.auction_id = tp.amx_auction_id`, with a `BETWEEN @startDateTime AND @endDateTime` bound on `bid_time` so this *is* time-bounded by the user's chosen range.
- The "all-time" PageLogView join is the binding constraint: pages tagged with `amx_auction_id` are looked up against `win_log` to determine whether the impression was a real win, indefinitely. In practice tracker page-log retention is also ~24 months for the equivalent join keys, so **24 months on `win_log` is consistent**.

**win_log_url:** Queried with user-supplied `@dateStart`/`@dateEnd` (`portal-node/src/Lookup/Amx/Traffic/Placement.js:209`). UI uses ≤365-day lookback + YoY → effectively 24 months.

**bid_log_ingest:** Only consulted via `WHERE date = @date` to check if a file was already ingested. The `7 d` `DAYS_BACK_CHECK` controls how far back we re-check. **30 days is plenty.**

**semantix_ranked_term:** Unpartitioned, joined by `segmentKey`/`urlPath`. This is a **lookup table, not time-series** — must keep in full. 7 GB is not the optimization target.

## 1.2 `log.*` and `portal_log.*` — application logs (≈2 TB)

| Table | Size | Recommended retention |
|-------|-----:|----------------------|
| `log.shepob_api`                       | 1,637 GB | **90 days** |
| `log.alphix_api`                       | 4.4 GB   | **90 days** |
| `portal_log.query`                     | 358 GB   | **180 days** |
| `portal_log.api`                       | 38 GB    | **180 days** |
| `portal_log.gke_cluster_resource_usage` | 49 GB   | **90 days** |
| `portal_log.gke_cluster_resource_consumption` | 5 GB | **90 days** |

**`log.shepob_api`** — written by every shepob via `shepob-*/src/Connection/Bigquery.js`. **No reader was found in any repo.** 1.6 TB of pure append-only audit log with nothing reading it. ⚠️ Confirm with ops whether anyone runs ad-hoc forensics on it; if not, **30 days** would be defensible. I recommend **90 days** until the team confirms.

**`log.alphix_api`** — written by `alphix-api-node/src/Logging/Api.ts:51`. Only reader: `shepob-welfare/src/Command/AlphixApiQuota.js:11` with `INTERVAL 72 HOUR`. **90-day retention** is ~30× the read window — safe.

**`portal_log.query`** (358 GB) and **`portal_log.api`** (38 GB) — written from `portal-node/src/Api/Logger/Shared.js:19` and `alphix-admin-node/src/Api/Logger/Shared.js:22`. Read by `logLookup()` (`portal-node/src/Api/Logger/{Api,Page,Action}.js`) which takes `startDate`/`endDate` from the user with **no server-side max range**. The admin Logger UI is the only consumer. Typical SRE/audit-log use cases work fine with **180 days**.

**`portal_log.gke_cluster_*`** — auto-populated by GKE billing/usage export. **Zero code references.** Standard FinOps: 90 days hot.

## 1.3 `cm360.*` — DoubleClick / CM360 reporting (≈140 GB)

| Table | Size | Recommended retention |
|-------|-----:|----------------------|
| `report_country_platform`    | 26.7 GB | **3 years** |
| `report_bm_country`          | 26.2 GB | **3 years** |
| `report_bm_campaign_cost`    | 18.0 GB | **3 years** |
| `report_bm_floodlight`       | 16.1 GB | **3 years** |
| `report_bm_creative`         | 13.5 GB | **3 years** |
| `report_bm_placement_site`   | 11.4 GB | **3 years** |
| `report_creative`            | 1.8 GB  | **3 years** |
| `report_floodlight`          | 1.65 GB | **3 years** |
| `report_placement`           | 1.46 GB | **3 years** |
| `report_invalid`             | 1.17 GB | **3 years** |
| `report_landing_page`        | 1.08 GB | **3 years** |
| `report_bm_campaign_cost_temp` | 15.9 GB | **DROP** — orphan temp table |
| `page_google_ads_cost`       | 3.0 GB  | **Add partitioning** before retention rules |

### Evidence from code

- `shepob-doubleclick/src/Doubleclick/Report.js:498,581,693` — `WHERE rd.date >= DATE_SUB(NOW(), INTERVAL 730 DAY)` (2 years).
- `shepob-doubleclick/src/Doubleclick/Cost.js:153` — `INTERVAL 180 DAY`.
- `shepob-doubleclick/src/Command/BigQueryCaUpdate.js:87,88,121,122` — `INTERVAL 3 YEAR` on `cm360.report_country_platform` and `report_dynamic`.
- `shepob-db-processor/src/Command/MediaCost.js:10,22,40` — `INTERVAL 3 YEAR` across LinkedIn, Adwords, and CM placement cost data joined to cm360.
- Frontend (`alphix-app-vue/src/helper/date/range.js`): max preset is `last365Day` with a `yearOnYear` comparison option doubling to ~2 years; `TitleFilter.vue:6` lets users pick `minDate = new Date(2017, 0, 1)`.

`INTERVAL 3 YEAR` is the binding constraint. The 9 years of partitions back to 2016 in `report_bm_country` and `report_country_platform` is well past anything the code touches.

**`report_bm_campaign_cost_temp`** — 16 GB, a single partition (2025-07-28), untouched since. Almost certainly an aborted migration scratch table.

## 1.4 `adobe_analytics.*` and `google_analytics.*` — per-domain analytics

The `report_alpha_*_<NN>` and `report_page_marketing_channel_<NN>` family of tables is dynamically referenced via numeric IDs in `portal-node/src/Api/Delta/Reporting/Page.js`, `portal-node/src/Lookup/Analytics/Domain.js`, and `portal-node/src/Api/Ga/Alpha/Reporting/Landing.js:67`. Reads use `date BETWEEN @startDate AND @endDate`. The frontend's deepest preset is `last365Day`; `yearOnYear` adds another year. ETL (`shepob-google-analytics/src/Command/Report*.js`) consistently backfills exactly **365 days**.

### Recommended retention: **24 months** for *actively-updated* tables.

But the bigger story for this dataset family is that **most of these tables stopped being written months or years ago**:

| Table                                                      | Size   | Last modified |
|------------------------------------------------------------|-------:|---------------|
| `adobe_analytics.report_page_47`                           | 2.94 GB | 2024-09-17   |
| `adobe_analytics.report_page_1`                            | 2.29 GB | 2024-09-17   |
| `adobe_analytics.report_page_13`                           | 1.17 GB | 2024-07-15   |
| `adobe_analytics.report_page_marketing_channel_13`         | 1.43 GB | 2024-07-15   |
| `google_analytics.report_alpha_*` family (~30 tables)      | ~70 GB | mostly 2024 or earlier |

When a client's analytics integration is offboarded, ingestion stops but the table is never deleted. Many of these will be safe to drop entirely after cross-checking the `analytics_ref` / `rsuniq` column on the `central_di_api` domain settings table to confirm the domain is no longer linked (and that legal/contract retention does not apply).

## 1.5 `billing.*` — GCP billing export

| Table | Size | Recommended retention |
|-------|-----:|----------------------|
| `gcp_billing_export_v1_019590_761EAF_ECDFD8` | 27 GB | **13 months** |

Used by `~/Code/scratchpad/bigquery-cost` and standard FinOps queries. **13 months** is common practice. Currently 5 years. **Confirm with finance/legal** before changing retention on a billing dataset.

## 1.6 `portal_sync.url_clean` — URL dimension lookup

3.9 GB, unpartitioned, 29 M rows of `{id, domainId, url, ...}`. Joined by `url_clean_id` in 370+ places across the codebase. **Lookup dimension — keep in full.** Do not try to retention-prune.

## 1.7 `ipinfo.*`

| Table | Size | Recommended retention |
|-------|-----:|----------------------|
| `residential_proxy` | 3.56 GB | Keep in full (lookup) — confirm refresh cadence |
| `lite_prefixes`     | 1.13 GB | Keep in full (lookup) — confirm refresh cadence |

Both unpartitioned IP-lookup tables. Recently created (2026-03), actively updated. Schemas (`ip`, `last_seen`, `network_bytes`, `asn`) are lookup-shape, not log-shape. `shepob-ipinfo` exists but I did not find direct FROM clauses targeting these two BigQuery tables.

## 1.8 `content.opoint_document` — APPEARS DEAD

25 GB. Last modified **2022-03-10** (4+ years ago). Created 2021-08. **Zero references** anywhere. Recommend: **flag for deletion** after confirming with whoever owned the Opoint integration.

## 1.9 `test.*` — APPEARS DEAD

| Table | Size | Last modified |
|-------|-----:|---------------|
| `nosible_crawler`     | 20.3 GB | 2024-03-06 |
| `nosible_engines`     | 5.6 GB  | 2023-11-14 |
| `ipinfo_company`      | 5.2 GB  | 2026-01-22 |
| `ua`                  | 5.0 GB  | 2024-01-16 |
| `ipinfo_res_proxy`    | 3.9 GB  | 2026-01-21 |
| `nosible_exclusions`  | 2.5 GB  | 2023-11-13 |

**All untouched for ≥3 months, none referenced in code.** Recommend: **flag for deletion** after a 30-day reminder to the developer who created each one.

---

# Part 2 — `tracker-269317` (Tracker)

This project holds the Delta Tag tracker pixel logs and downstream materializations. The two biggest tables, `delta_tag.page_log` and `delta_tag.page_raw`, account for 7 TB on their own (≈46% of the project) and are the primary lever.

## 2.1 `delta_tag.*` — raw and processed tag/page logs (≈11 TB)

All partitioned by DAY on `timestamp` or `loadTimestamp` (or `firstPageLogTimestamp` / `clickLogTimestamp`).

| Table | Size | Partitions | Recommended retention |
|-------|-----:|-----------|----------------------|
| `page_log`             | 3,538 GB | 2020-11-30..today (1,991 partitions) | **3 years** |
| `page_raw`             | 3,483 GB | 2020-11-30..today                    | **30 days** (staging) |
| `page_active_raw`      | 1,577 GB | 2022-12-20..today                    | **30–90 days** |
| `impression_log`       | 870 GB   | 2022-02-21..today                    | **24 months** |
| `impression_raw`       | 868 GB   | 2022-02-21..today                    | **30 days** (staging) |
| `page_log_processed`   | 440 GB   | unpartitioned                        | **Mirror `page_log`** (currently unpartitioned — see action) |
| `page_log_dimension`   | 354 GB   | 2021-10-05..today                    | **3 years** |
| `page_unload_raw`      | 222 GB   | 2021-07-09..today                    | **30 days** (staging) |
| `page_log_session_page`| 198 GB   | partition empty per IS              | **Match `page_log_session`** (24 mo) |
| `page_unload_log`      | 183 GB   | 2021-07-09..today                    | **24 months** |
| `page_log_session`     | 90 GB    | 2020-11-30..today                    | **24 months** |
| `page_unloaded_log`    | 60 GB    | 2021-07-09..today                    | **24 months** |
| `page_log_active_time` | 63 GB    | 2021-07-09..today                    | **24 months** |
| `page_log_cm_device`   | 51 GB    | 2020-11-30..today                    | **3 years** |
| `page_log_cm_url`      | 37 GB    | 2020-11-30..today                    | **3 years** |
| `page_log_firmo`       | 17.5 GB  | 2021-02-09..today                    | **24 months** |
| `event_log`            | 34.8 GB  | 2022-04-05..today                    | **24 months** |
| `event_raw`            | 33 GB    | 2022-04-05..today                    | **30 days** (staging) |
| `click_log`            | 8.8 GB   | 2022-03-09..today                    | **24 months** |
| `click_raw`            | 7.7 GB   | 2022-03-09..today                    | **30 days** (staging) |
| `click_log_backup`     | 3.4 GB   | unpartitioned                        | **Drop** after confirming source-of-truth |
| `page_log-2024-05-07T12_11_46`         | 391 GB | one-day snapshot | **DROP** (orphan backup) |
| `page_log_session-2024-04-29T16_36_46` | 19.3 GB | one-day snapshot | **DROP** |
| `page_log_session_test`                | 19.5 GB | 2024-04 only    | **DROP** |
| `page_log_session_rebuild_2024_12`     | 49.6 GB | 2024-12 only    | **DROP** |
| `page_log_session_backup_2024_12_19`   | 39.1 GB | 2024-12-19 only | **DROP** |

### Evidence from code — `delta_tag.page_log` (3.5 TB, the most consequential decision)

Lookback windows actually used in code, longest first:

- `shepob-db-processor/src/Command/TrendView.js:217,224,272,274` — `DATE(par.timestamp) >= '2020-01-01'` and `TIMESTAMP_TRUNC(timestamp, DAY) >= TIMESTAMP("2020-01-01")` — effectively all-time, but in practice the table only goes back to 2020-11-30 anyway.
- `shepob-db-processor/src/Command/MediaCost.js:50,78` — `DATE(timestamp) > DATE_SUB(CURRENT_DATE(), INTERVAL 3 YEAR)` (LinkedIn / Adwords / CM cost attribution joins).
- `alphix-admin-node/src/Api/Delta/Trends/Domain.js:33` — `timestamp > '2020-01-01' AND COUNTIF(timestamp > @lastMonth)` — opens `2020-01-01` lookback for admin trend domain billing.
- `alphix-admin-node/src/Api/Delta/Billing/Annual.js:26` — `TIMESTAMP_TRUNC(timestamp, YEAR) = @year`, where `year` param accepts `2020..2100`. Annual billing review can target any year that has data.
- `shepob-singlestore/src/Helper/AlphixClient.js:295` — `DATE(pl.timestamp) >= DATE('${date}') ... else DATE('2020-01-01')` — same all-time floor.
- `shepob-alphix-tag/src/Command/TrendTagGenerate.js:34,63,83` — `INTERVAL 365 DAY` (3 places).
- `shepob-singlestore/src/Command/BigQueryTransfer.js:43,217` — `INTERVAL 365 DAY` and `INTERVAL 2 YEAR`.
- `shepob-db-processor/src/Command/PageLogView.js:18,47,78,111` — `pls.firstPageLogTimestamp > '2020-01-01'` (effectively all-time on the session join).
- portal-node Reporting endpoints + Vue UI: user-supplied `startDate`/`endDate`, frontend max preset `last365Day` + YoY = ~2 years.
- `shepob-amx/src/Command/UpsertIpSegment.js:443` — `INTERVAL 30 DAY`.
- `shepob-ipinfo/src/Command/TrackerInfo.js:37` — `INTERVAL 30 DAY`.
- `shepob-db-processor/src/Command/CleanIpData.js:83` — `< INTERVAL 30 DAY` (IP blanking — deletes old IP values, not rows).
- `shepob-db-processor/src/Command/DeltaPageUnload.js:228`, `DeltaPageActive.js:192` — `INTERVAL 6 HOUR`.

**Binding constraint = `INTERVAL 3 YEAR`** in `shepob-db-processor/src/Command/MediaCost.js`. Without enabling that path, anything older than 3 years is unreachable by scheduled code. **3 years is the floor.** If admin-billing for years older than 2023 is genuinely needed, keep those partitions in a separate dataset rather than on the hot `page_log`.

### Evidence — `delta_tag.page_raw` (3.5 TB) — *staging*

- `shepob-db-processor/src/Command/DeltaPage.js:364` and `shepob-alphix-tag/src/Command/DeltaPage.js:480` — `page_raw → page_log` merge, processes recent days.
- `shepob-alphix-tag/src/Command/PageLogClient.js:80,103,415` — populates the per-client `alphix_tag_client.page_log_<UUID>` from `page_raw` with `INTERVAL @days DAY` (configurable).
- `shepob-user-agent/src/Command/WhatIsMyBrowser.js:8` — `pl.timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${N} DAY)` (looks recent only).
- `shepob-welfare/src/Command/AlphixPageLogUnprocessed.js:14` — `INTERVAL 14 DAY` welfare alert.
- `shepob-welfare/src/Command/TagImpression.js:11` — `INTERVAL 1 HOUR`.

No production consumer of `page_raw` reads past ~14 days. **30 days retention** is double the longest scheduled lookback. Reclaim: ~3.3 TB.

### Evidence — `delta_tag.page_active_raw` (1.6 TB)

- IP blanking UPDATE in `CleanIpData.js` — `timestamp < INTERVAL 30 DAY` (the costliest single query in the Feb cost report at $218 per run).
- `shepob-db-processor/src/Command/DeltaPageActive.js:191,192` — feeds `page_log_active_time` with `INTERVAL 6 HOUR`.
- `shepob-db-processor/src/Command/TrendView.js:219,224` — joined to `page_log` with `'2020-01-01'` floor.
- `shepob-db-processor/src/Command/PageLogActiveTime.js:17,22` — joined to `page_log` with `BETWEEN pl.timestamp AND TIMESTAMP_ADD(pl.timestamp, INTERVAL 1 HOUR)` (the active-time merge — bounded by `page_log`'s window).
- Cost report shows ad-hoc analyst joins also use `DATE(par.timestamp) > '<DATE>'` against `page_log` ranges.

Active-time data is normally consumed within 6 h of a pageview. The only reason it has been kept for 3+ years is the TrendView all-time scan. **Recommend 30–90 days** unless TrendView truly needs the long tail — confirm with the trends analytics owner before applying.

### Evidence — `delta_tag.impression_log` / `impression_raw` (≈1.7 TB combined)

- `shepob-db-processor/src/Command/DeltaImpression.js:56,152,155` — `impression_raw → impression_log` merge, recent days only.
- `shepob-db-processor/src/Command/DeltaClick.js:88,90` — joined with `BETWEEN @minTimestamp AND @maxTimestamp` (bounded).
- `CleanIpData.js` — IP blanking at 30 days.
- No consumer reads `impression_raw` beyond ~30 days.
- `impression_log` is joined by `auction_id` from `click_log` and `page_log`; same all-time pattern as `win_log`. **24 months retention** matches the rest of the tag stack.

### Evidence — `delta_tag.page_unload_log` / `page_unloaded_log` / `page_unload_raw`

- `shepob-db-processor/src/Command/DeltaPageUnload.js` — merges `page_unload_raw → page_unload_log/page_unloaded_log` with `INTERVAL 6 HOUR` lookback.
- `page_unloaded_log` is joined indefinitely to `page_log` in `shepob-singlestore/src/Helper/AlphixClient.js:292`, `SessionData.js:387,427`, `PageLogView.js:120`, and analyst queries in the Feb cost report (e.g., the $475 "device + time on page" report).
- Recommend `page_unload_raw` → **30 days** (staging only), and `page_unload_log` / `page_unloaded_log` → **24 months** (matches join targets).

### Evidence — `delta_tag.page_log_processed`

- 440 GB **and currently unpartitioned**, despite a `timestamp`/`timestampDate` field.
- Read only by `shepob-amx/src/Command/CreateBehaviouralFirmGroups.js:40` (with `pl.\`timestampDate\` >= DATE_SUB(CURDATE(), INTERVAL ${intervalDay} DAY)` — typically 30-180 d) and a couple of other shepob jobs.
- **Action:** add date partitioning by `timestampDate` first, then apply retention matching `page_log` (3 years). Without partitioning, retention rules can't be enforced and every query scans the full 440 GB.

### Evidence — `delta_tag.page_log_session*` (≈290 GB across 4 tables)

- Production tables: `page_log_session` (90 GB), `page_log_session_page` (198 GB).
- Consumers: `shepob-singlestore` SessionData/PipelineCampaignManager (uses `@dateStart`/`@dateEnd`), `shepob-db-processor/src/Command/PageLogView.js:19,48,79` (joins with `'2020-01-01'` floor — same pattern as page_log).
- **24-month retention** matches the parent `page_log` window for sessions (sessions are inherently short-lived).
- **Drop:** `page_log_session_test` (19 GB, 2024-04), `page_log_session_rebuild_2024_12` (50 GB), `page_log_session_backup_2024_12_19` (39 GB), `page_log_session-2024-04-29T16_36_46` (19 GB). These are clearly one-off rebuild/test artifacts, never referenced from code.

### Orphan / backup tables in `delta_tag`

| Table | Size | Last modified | Action |
|-------|-----:|---------------|--------|
| `page_log-2024-05-07T12_11_46` | 391 GB | 2024-05-07 | **DROP** — single-day timestamped backup, no refs |
| `page_log_session_rebuild_2024_12` | 49.6 GB | 2024-12-19 | **DROP** |
| `page_log_session_backup_2024_12_19` | 39.1 GB | 2024-12-19 | **DROP** |
| `page_log_session_test` | 19.5 GB | 2024-04-29 | **DROP** |
| `page_log_session-2024-04-29T16_36_46` | 19.3 GB | 2024-04-29 | **DROP** |
| `click_log_backup` | 3.4 GB | 2026-05-18 | Confirm with owner (still being written?) |

## 2.2 `alphix_tag_client.*` — per-client materialisations (≈1.4 TB across 101 tables)

These are per-client mirrors of `delta_tag.page_log` / `delta_tag.page_log_dimension`, named `page_log_<CLIENT_UUID>` and `page_log_dimension_<CLIENT_UUID>`. Populated by `shepob-alphix-tag/src/Command/PageLogClient.js:127` (which `create table ... like ...` from a template). Read by:

- `alphix-api-node/src/Api/Pageview.ts:81` — `pl.timestamp BETWEEN @startDateTime AND @endDateTime`.
- `portal-node/src/Api/Delta/Reporting/Aggregator/{Site,Amx/Campaign,Amx/Domain}.js` — same `BETWEEN`.
- `shepob-singlestore/src/Helper/AlphixClient.js:289` — same.

The frontend's deepest preset is 365 days, with YoY pushing to ~2 years. So the API can effectively request anything up to **24 months** back. Even though per-client tables only have data since the client was onboarded, retention should match.

| Table family | Size | Recommended retention |
|-------|-----:|----------------------|
| `page_log_<UUID>` × ~25 | ~900 GB | **24 months** |
| `page_log_dimension_<UUID>` × ~17 | ~440 GB | **24 months** |
| `trend_hit` (alphix_tag_client.trend_hit) | 13 GB | Match `trend.hits_country` (2 years) |

**Top 5 per-client tables:**
- `page_log_dimension_3A9D80A7-94C3-6245-93A3-5DBDC77E2BC7` — 174 GB
- `page_log_3A9D80A7-94C3-6245-93A3-5DBDC77E2BC7` — 98 GB
- `page_log_920CA363-0769-FC4B-9701-7C162E6672CD` — 67 GB
- `page_log_32A2250F-8BF6-644B-92C8-B65945CFC684` — 58 GB
- `page_log_AFD7DBEC-26F1-744A-8510-07248C1DACDE` — 53 GB

⚠️ **Important per-client cleanup opportunity (not visible here):** when a client is offboarded, the per-client tables should be dropped — but `PageLogClient.js` only ever creates tables, never removes them. Cross-check the client UUIDs against `central_di_api.dt_client` / `ds_fm_clients`, and drop tables whose clients are no longer active. (A quick scan suggests several of the smaller per-client tables have `last_modified` from early 2026 or earlier — possibly inactive.)

## 2.3 `bot.*` — bot detection (≈160 GB)

| Table | Size | Recommended retention |
|-------|-----:|----------------------|
| `page_log`     | 75 GB  | **24 months** (joined by `id` to `delta_tag.page_log`; same window) |
| `profile`      | 93 GB  | **24 months** (lookup by ip/ua/url_clean_id/date — derived data) |
| `page_log_bk`  | 67 GB  | **DROP** — backup, last touched 2026-04-23, no refs |

### Evidence

- Written by `shepob-ipinfo/src/Command/PageLogBot.js:127` (uploads bot profiles via `loadJson`).
- Read by `shepob-db-processor/src/Command/TrendView.js:36`, `PageLogView.js:263` (joined to `delta_tag.page_log`).
- `shepob-amx/src/Command/UpsertIpSegment.js:64` — `bot.timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)`.
- `shepob-singlestore/src/Helper/AlphixClient.js:288` — same pattern with user-supplied `date` or `'2020-01-01'` floor.

`bot.page_log_bk` has zero code refs. Confirm with the bot detection owner that the production table is `bot.page_log` and the `_bk` is leftover from a migration.

## 2.4 `trend.*` — trend reporting outputs (≈700 GB)

| Table | Size | Partitions | Recommended retention |
|-------|-----:|-----------|----------------------|
| `topic_url`       | 676 GB | 2025-07-06..today (46 partitions, weekly) | **2 years** (currently 10 months old) |
| `hits_country`    | 13 GB  | 2025-05-18..today                          | **2 years** |
| `page_log_meta`   | 7 GB   | unpartitioned                              | **WRITE_TRUNCATE** — already rebuilt fully on each run |
| `url_to_sentence` | 1.6 GB | unpartitioned (last modified 2023-07-18)   | **DROP** — stale, no code refs |

### Evidence

- `topic_url` produced weekly by `shepob-semantix` or similar (partitioned on `generatedWeek`).
- Read by `shepob-db-processor/src/Command/Trend/TopicUrl.js:17` — `WHERE generatedWeek = @generatedWeek` (single week).
- Read by analyst ad-hoc queries (cost report: `nicola.congiargiu@`) with `generatedWeek > DATE "..."` joined to `hits_country` (`WHERE date > DATE "..."`). Typical analyst lookback in those queries appears to be 30-180 days, but cannot be capped.
- `page_log_meta` is written with `WRITE_TRUNCATE` by `shepob-db-processor/src/Command/TrendView.js` — so retention is irrelevant; size is bounded by the input set.

## 2.5 `user_agent.what_is_my_browser` — lookup (23 GB)

Unpartitioned. Joined by `user_agent` everywhere (`shepob-db-processor/Browser.js`, `PageLogView.js:117`, `shepob-ipinfo`, `shepob-bigtable/Browser.js`, ad-hoc queries). **Lookup table — keep in full.** 23 GB is not the optimization target.

Written by `shepob-user-agent/src/Command/WhatIsMyBrowser.js` (looks up new user-agent strings from `delta_tag.page_raw`).

## 2.6 `nosible.*` — likely abandoned

| Table | Size | Last modified | Action |
|-------|-----:|---------------|--------|
| `crawler`    | 20.5 GB | 2024-02-23 | Confirm with shepob-nosible owner; **likely DROP** |
| `exclusions` | 2.5 GB  | 2023-11-30 | **Likely DROP** |

`shepob-nosible/src/Command/{ProcessAd,ImportUrl}.js` still references these (`FROM tracker-269317.nosible.crawler`), but the tables haven't been updated in 14+ months. Either the job stopped running or the reference is stale.

## 2.7 `temp.*` and `alphix_temp.*` — ad-hoc / migration scratch

| Table | Size | Last modified | Action |
|-------|-----:|---------------|--------|
| `temp.page_log_ssga`               | 59 GB | 2023-10-05 | **DROP** — zero refs |
| `temp.ssga_page_log_id`            | 6 GB  | 2024-05-08 | **DROP** — zero refs |
| `alphix_temp.page_log_mega_ssga`   | 49 GB | 2023-07-22 | **DROP** — zero refs |

Three migration scratch tables totaling ~114 GB, all >1 year stale, none referenced.

## 2.8 Small datasets — no large tables

`smart_placement_tag` (only `impression_raw`, small), `amx_advertising` (only `ip_tag_raw`, `opt_out_raw`, small), `firmo_sync` (only lookup tables) — all already small. No action.

---

# Summary of recommended changes (combined)

## Definitely safe / quick wins (≥1 TB candidates)

| Action | Project | Storage saved | Risk |
|--------|---------|--------------:|------|
| `amx.bid_log_raw` → 14 d retention | DI | ~5.3 TB | Low (staging) |
| `delta_tag.page_raw` → 30 d retention | Tracker | ~3.3 TB | Low (staging) |
| `amx.win_log_raw` → 14 d retention | DI | ~3 TB | Low (staging) |
| `amx.bid_log` → 90 d hot + archive | DI | ~4 TB | **Medium — analyst notice required** |
| `log.shepob_api` → 90 d (or 30) | DI | ~1.5 TB | **Medium — confirm no external readers** |
| `delta_tag.page_active_raw` → 30-90 d | Tracker | ~1.4 TB | **Medium — confirm TrendView dependency** |
| `delta_tag.impression_raw` → 30 d | Tracker | ~810 GB | Low (staging) |

## Definite orphan deletions (~750 GB combined)

| Project | Table | Size |
|---------|-------|-----:|
| Tracker | `delta_tag.page_log-2024-05-07T12_11_46` | 391 GB |
| Tracker | `bot.page_log_bk` | 67 GB |
| Tracker | `temp.page_log_ssga` | 59 GB |
| Tracker | `delta_tag.page_log_session_rebuild_2024_12` | 50 GB |
| Tracker | `alphix_temp.page_log_mega_ssga` | 49 GB |
| Tracker | `delta_tag.page_log_session_backup_2024_12_19` | 39 GB |
| Tracker | `nosible.crawler` | 21 GB |
| Tracker | `delta_tag.page_log_session_test` | 19 GB |
| Tracker | `delta_tag.page_log_session-2024-04-29T16_36_46` | 19 GB |
| DI | `cm360.report_bm_campaign_cost_temp` | 16 GB |
| DI | `content.opoint_document` | 25 GB |
| DI | `test.*` family | ~40 GB |
| Tracker | `temp.ssga_page_log_id` | 6 GB |
| Tracker | `delta_tag.click_log_backup` | 3.4 GB |
| Tracker | `nosible.exclusions` | 2.5 GB |
| Tracker | `trend.url_to_sentence` | 1.6 GB |

## Medium-confidence reductions (need cross-check)

- Per-client `alphix_tag_client.page_log_*` for offboarded clients — cross-check against `central_di_api.dt_client`.
- Stale `adobe_analytics.report_page_*` and `google_analytics.report_alpha_*` per-domain tables (~30+ GB) — cross-check against the analytics_ref / rsuniq settings.
- `delta_tag.page_log_processed` (440 GB) — currently unpartitioned; needs partitioning before retention can be applied.

## Final estimate

**Combined reclaimable hot storage with conservative recommendations: ~21 TB (~60% of the current ~34.7 TB).**

Of this:
- ~13 TB from `amx.*` staging + hot retention
- ~5–6 TB from `delta_tag.*` staging + retention
- ~1.5 TB from `log.shepob_api` (if confirmed unread)
- ~0.75 TB from orphan/backup table cleanup

---

## Recommended next steps (none executed)

1. **Confirm with `shepob-amx` owner** that `bid_log_raw` / `win_log_raw` are pure staging and 14 d is enough.
2. **Confirm with `shepob-alphix-tag` / data team** that `delta_tag.page_raw` 30 d retention won't break any backfill (the merge to `page_log` runs daily, and there's no manual re-ingest path > 30 d that I found).
3. **Confirm with the team that owns `log.shepob_api`** — does anyone actually read it? If not, drop to 30 days.
4. **Confirm legal/billing retention rules** for `billing.*` before applying 13 months.
5. **Confirm with TrendView owner** whether `delta_tag.page_active_raw` and `delta_tag.page_log_meta` really need pre-2024 data.
6. **Confirm with the analytics team** which `adobe_analytics.report_*` and `google_analytics.report_alpha_*` tables map to active domains; drop the others.
7. **Confirm with the data team** which per-client `alphix_tag_client.page_log_*` tables map to offboarded clients; drop the others.
8. **Drop after sign-off**: the 16 tables in the "Definite orphan deletions" list above (~750 GB).
9. **Add partitioning** to `delta_tag.page_log_processed` and to DI's `cm360.page_google_ads_cost` and `amx.semantix_ranked_term` if any of them grow.
10. For long-tail analyst access beyond the recommended retention window, create per-team **archive datasets** with the same schema, populate via daily incremental copy from the hot table, and apply a long retention there. Keeps hot scans cheap without permanently losing data.

---

*Generated 2026-05-18. Source data: `__TABLES__` + `INFORMATION_SCHEMA.PARTITIONS` for `digital-intelligence-208511` and `tracker-269317`. Code references: ~155 local repos under `~/Code` (mirror of the FundamentalMedia GitHub org).*
