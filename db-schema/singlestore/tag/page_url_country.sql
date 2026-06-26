CREATE TABLE `page_url_country` (
  `url_clean_id` int(11) NOT NULL DEFAULT '0',
  `url_clean` varchar(3500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `topCountry` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `countryList` JSON COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`url_clean_id`,`topCountry`),
  SHARD KEY `__SHARDKEY` (`url_clean_id`,`topCountry`),
  SORT KEY `__UNORDERED` ()
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
