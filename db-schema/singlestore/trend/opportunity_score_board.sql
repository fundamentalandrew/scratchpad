CREATE TABLE `opportunity_score_board` (
  `boardUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `clientUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `date` date NOT NULL,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`boardUuid`,`clientUuid`,`date`),
  KEY `opportunity_score_board_boardUuid` (`boardUuid`) USING HASH,
  KEY `opportunity_score_board_clientUuid` (`clientUuid`) USING HASH,
  KEY `opportunity_score_board_date` (`date`) USING HASH,
  KEY `opportunity_score_board_status` (`status`) USING HASH,
  SHARD KEY `__SHARDKEY` (`boardUuid`,`clientUuid`,`date`),
  SORT KEY `__UNORDERED` ()
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
