CREATE TABLE `trend_hit_topic` (
  `clientUuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `country` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `date` date NOT NULL,
  `hits` int(11) NOT NULL,
  PRIMARY KEY (`clientUuid`,`country`,`date`),
  SHARD KEY `__SHARDKEY` (`clientUuid`,`country`,`date`),
  SORT KEY `__UNORDERED` ()
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
