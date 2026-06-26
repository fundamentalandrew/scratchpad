CREATE TABLE `ai_asset_builder_campaign_approval_lock` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approvalUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sequence` int(10) unsigned NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `manifest` json DEFAULT NULL COMMENT 'Frozen preview payload { name, items:[{itemUuid, htmlBucket, htmlPrefix, width, height}] } read by the unauthenticated preview.',
  `createdBy` int(10) unsigned DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `invalidatedBy` int(10) unsigned DEFAULT NULL,
  `invalidatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `uq_apl_token` (`token`),
  UNIQUE KEY `uq_apl_approval_sequence` (`approvalUuid`,`sequence`),
  KEY `idx_apl_approval` (`approvalUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
