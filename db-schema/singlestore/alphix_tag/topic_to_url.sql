CREATE TABLE `topic_to_url` (
  `topic_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `url_clean_id` int(11) NOT NULL,
  PRIMARY KEY (`topic_id`,`url_clean_id`),
  SHARD KEY `__SHARDKEY` (`topic_id`,`url_clean_id`),
  SORT KEY `__UNORDERED` ()
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
