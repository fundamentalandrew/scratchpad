CREATE TABLE `ai_asset_builder_campaign_news` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'News search UUID',
  `campaignUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: campaign.uuid',
  `clientUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Multi-tenant isolation',
  `summary` text COLLATE utf8mb4_unicode_ci COMMENT 'AI-generated market briefing',
  `query` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Comma-separated keywords used for search',
  `keywords` json DEFAULT NULL COMMENT 'Keyword array',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'pending/searching/summarizing/complete/failed',
  `searchParams` json DEFAULT NULL COMMENT 'Date range, language, domain filters',
  `generatedFor` int(11) NOT NULL COMMENT 'User ID who triggered generation',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_campaign_uuid` (`campaignUuid`),
  KEY `idx_client_uuid` (`clientUuid`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nosible news search results and AI market briefings per campaign';
