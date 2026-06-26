CREATE TABLE `trend_topic_url` (
  `topicUuid` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `urlCleanId` int(11) unsigned NOT NULL,
  `lastHit` timestamp NOT NULL,
  PRIMARY KEY (`topicUuid`,`urlCleanId`),
  SHARD KEY `__SHARDKEY` (`topicUuid`,`urlCleanId`),
  SORT KEY `__UNORDERED` ()
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
