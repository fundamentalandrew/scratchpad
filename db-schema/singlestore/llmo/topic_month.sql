CREATE TABLE `topic_month` (
  `topicClusterUuid` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `yearMonth` date NOT NULL,
  `pageViewsTotal` int(10) unsigned DEFAULT NULL,
  `answerEngineViewsTotal` int(10) unsigned DEFAULT NULL,
  `pageFrequency` int(10) unsigned DEFAULT NULL,
  `trafficWeightFactor` decimal(10,9) DEFAULT NULL,
  SHARD KEY `__SHARDKEY` (`topicClusterUuid`,`yearMonth`),
  UNIQUE KEY `PRIMARY` (`topicClusterUuid`,`yearMonth`) USING HASH,
  SORT KEY `__UNORDERED` ()
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
