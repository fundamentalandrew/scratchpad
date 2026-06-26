CREATE TABLE `page_media` (
  `date` date NOT NULL,
  `clientUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `url_clean_id` int(11) NOT NULL,
  `domain_id` int(11) NOT NULL,
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `country` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `impressions` decimal(15,5) DEFAULT NULL,
  `clicks` decimal(15,5) DEFAULT NULL,
  `costGbp` decimal(15,5) DEFAULT NULL,
  `standAloneClicks` decimal(15,5) DEFAULT NULL,
  `standAloneCostGbp` decimal(15,5) DEFAULT NULL,
  PRIMARY KEY (`date`,`clientUuid`,`url_clean_id`,`type`,`country`),
  SHARD KEY `__SHARDKEY` (`date`,`clientUuid`,`url_clean_id`,`type`,`country`),
  SORT KEY `url_clean_id` (`date`,`clientUuid`,`url_clean_id`,`type`,`country`)
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
