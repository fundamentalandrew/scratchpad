CREATE TABLE `ai_asset_builder_campaign_approval` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `campaignUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `currentLockUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdBy` int(10) unsigned DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_apr_campaign` (`campaignUuid`),
  KEY `idx_apr_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
