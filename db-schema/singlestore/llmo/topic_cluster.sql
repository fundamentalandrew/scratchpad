CREATE TABLE `topic_cluster` (
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `topicExpanded` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `centroidEmbedding` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `createdAt` datetime NOT NULL,
  `UpdatedAt` datetime NOT NULL,
  SHARD KEY `__SHARDKEY` (`uuid`),
  UNIQUE KEY `PRIMARY` (`uuid`) USING HASH,
  SORT KEY `__UNORDERED` ()
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
