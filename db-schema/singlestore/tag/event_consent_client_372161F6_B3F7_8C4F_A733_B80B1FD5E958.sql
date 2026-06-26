CREATE TABLE `event_consent_client_372161F6_B3F7_8C4F_A733_B80B1FD5E958` (
  `eventConsentUuid` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sessionId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `consentShown` tinyint(1) DEFAULT NULL,
  `consentPassed` tinyint(1) DEFAULT NULL,
  `postConsentPageShown` tinyint(1) DEFAULT NULL,
  `engagedSession` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`sessionId`),
  SORT KEY `__UNORDERED` (),
  SHARD KEY `__SHARDKEY` (`sessionId`)
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES' CHARACTER SET=`utf8mb4` COLLATE=`utf8mb4_general_ci`;
