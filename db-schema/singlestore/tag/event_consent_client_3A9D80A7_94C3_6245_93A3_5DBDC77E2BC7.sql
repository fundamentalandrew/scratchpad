CREATE TABLE `event_consent_client_3A9D80A7_94C3_6245_93A3_5DBDC77E2BC7` (
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
