CREATE TABLE `ai_asset_builder_campaign_setting` (
  `campaignUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: campaign.uuid',
  `setting` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Setting key (e.g., goal, audience, folderUuid)',
  `value` text COLLATE utf8mb4_unicode_ci COMMENT 'Setting value (can be JSON for arrays like languages, markets)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`campaignUuid`,`setting`),
  KEY `idx_campaign_uuid` (`campaignUuid`),
  KEY `idx_setting` (`setting`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Campaign configuration settings (key-value pairs)';
