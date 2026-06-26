CREATE TABLE `ai_asset_builder_campaign_activation_cm_job` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activationUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approvalUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dcJobUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempt` int(10) unsigned NOT NULL DEFAULT '1',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `result` json DEFAULT NULL,
  `error` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `dcJobUuid` (`dcJobUuid`),
  KEY `idx_acmj_activation` (`activationUuid`),
  KEY `idx_acmj_approval` (`approvalUuid`),
  KEY `idx_acmj_dcjob` (`dcJobUuid`),
  KEY `idx_acmj_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
