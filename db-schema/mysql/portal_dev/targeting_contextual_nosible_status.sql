CREATE TABLE `targeting_contextual_nosible_status` (
  `targetingContextualProfileId` bigint(20) unsigned NOT NULL,
  `urlPath` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`targetingContextualProfileId`,`urlPath`) USING BTREE,
  KEY `targetingContextualProfileId_idx` (`targetingContextualProfileId`) USING BTREE,
  KEY `urlPath_idx` (`urlPath`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
