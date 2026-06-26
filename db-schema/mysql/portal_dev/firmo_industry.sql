CREATE TABLE `firmo_industry` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thirdParty` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thirdPartyId` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `groupId` int(10) unsigned NOT NULL,
  `groupName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `firmo_industry_thirdParty_IDX` (`thirdParty`,`thirdPartyId`) USING BTREE,
  KEY `firmo_industry_groupId_IDX` (`groupId`) USING BTREE,
  KEY `firmo_industry_level_IDX` (`level`) USING BTREE,
  KEY `firmo_industry_createdAt_IDX` (`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
