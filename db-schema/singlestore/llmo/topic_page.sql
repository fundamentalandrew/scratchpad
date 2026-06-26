CREATE TABLE `topic_page` (
  `llmoPageUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `llmoDomainUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `topicClusterUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `frequency` int(10) unsigned DEFAULT NULL,
  `keywordRank` int(10) unsigned DEFAULT NULL,
  `importanceScore` decimal(10,5) DEFAULT NULL,
  SHARD KEY `__SHARDKEY` (`llmoPageUuid`,`topicClusterUuid`),
  UNIQUE KEY `PRIMARY` (`llmoPageUuid`,`topicClusterUuid`) USING HASH,
  SORT KEY `__UNORDERED` ()
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
