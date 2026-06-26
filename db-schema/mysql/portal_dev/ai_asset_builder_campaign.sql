CREATE TABLE `ai_asset_builder_campaign` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Campaign UUID',
  `clientUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Multi-tenant isolation',
  `selectedBriefUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ref: campaign_brief.uuid (currently selected brief)',
  `selectedNarrativeContentUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ref: campaign_narrative.uuid (currently selected narrative)',
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Campaign name',
  `stages` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON: workflow stage tracking',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'active/archived/deleted',
  `creator` int(11) NOT NULL COMMENT 'User ID who created campaign',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_client_uuid` (`clientUuid`),
  KEY `idx_status` (`status`),
  KEY `idx_creator` (`creator`),
  KEY `idx_client_status` (`clientUuid`,`status`),
  KEY `idx_created_at` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Core campaign records';
