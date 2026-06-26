CREATE TABLE `ai_asset_builder_campaign_document` (
  `campaignUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: campaign.uuid',
  `documentUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: document.uuid',
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`campaignUuid`,`documentUuid`),
  KEY `idx_campaign_uuid` (`campaignUuid`),
  KEY `idx_document_uuid` (`documentUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Campaign-document many-to-many links';
