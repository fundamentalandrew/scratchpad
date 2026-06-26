CREATE ROWSTORE TABLE `client_domain` (
  `clientUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `domainId` int(11) unsigned NOT NULL,
  SHARD KEY `clientUuid` (`clientUuid`,`domainId`),
  PRIMARY KEY (`clientUuid`,`domainId`)
) AUTOSTATS_CARDINALITY_MODE=PERIODIC AUTOSTATS_HISTOGRAM_MODE=CREATE SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
