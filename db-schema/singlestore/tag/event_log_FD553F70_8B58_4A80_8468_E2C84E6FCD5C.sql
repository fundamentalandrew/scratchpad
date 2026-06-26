CREATE TABLE `event_log_FD553F70_8B58_4A80_8468_E2C84E6FCD5C` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `timestamp` datetime NOT NULL,
  `load_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `load_timestamp` datetime DEFAULT NULL,
  `session_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `first_page_log_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `event_code` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `event_amount` float unsigned DEFAULT NULL,
  `event_value` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `invalid_amx_impression` tinyint(4) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `load_id` (`load_id`) USING HASH,
  SORT KEY `__UNORDERED` (),
  SHARD KEY `__SHARDKEY` (`id`)
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
