CREATE TABLE `nosible_story` (
  `actionId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `published` date NOT NULL,
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `introduction` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `shortSummary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `sentiment` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `countryList` JSON COLLATE utf8mb4_bin,
  `articleTitleList` JSON COLLATE utf8mb4_bin,
  `searchText` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`actionId`,`published`),
  SHARD KEY `__SHARDKEY` (`actionId`,`published`),
  SORT KEY `url_clean_id` (`actionId`,`published`),
  FULLTEXT USING VERSION 1 KEY `searchText` (`searchText`)
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
