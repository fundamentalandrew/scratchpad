CREATE TABLE `trend_hit2` (
  `date` datetime DEFAULT NULL,
  `clientUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `url_clean_id` int(11) DEFAULT NULL,
  `country` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `domain_id` int(11) DEFAULT NULL,
  `sectorCode` int(11) DEFAULT NULL,
  `industryGroupCode` int(11) DEFAULT NULL,
  `industryCode` int(11) DEFAULT NULL,
  `subIndustryCode` int(11) DEFAULT NULL,
  `hits` int(11) DEFAULT NULL,
  `botHits` int(11) DEFAULT NULL,
  SORT KEY `date` (`date`),
  SHARD KEY `__SHARDKEY` (`url_clean_id`)
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
