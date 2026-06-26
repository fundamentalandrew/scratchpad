CREATE TABLE `page_log_meta_uc_copy` (
  `page` varchar(3500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `id` int(11) NOT NULL DEFAULT '0',
  `domainId` int(11) DEFAULT NULL,
  `meta` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `firstSeen` date DEFAULT NULL,
  `language` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  SHARD KEY `__SHARDKEY` (`id`),
  SORT KEY `id` (`id`),
  KEY `domain_idx` (`domainId`) USING HASH,
  FULLTEXT USING VERSION 2 KEY `meta_idx` (`meta`)
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
