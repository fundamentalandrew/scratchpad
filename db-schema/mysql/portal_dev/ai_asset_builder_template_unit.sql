CREATE TABLE `ai_asset_builder_template_unit` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unit UUID',
  `templateUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: template.uuid',
  `sizeUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: creative_size.uuid (shared table)',
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unit name (e.g. 300x250 Leaderboard)',
  `schema` json DEFAULT NULL COMMENT 'Unit-specific schema with charLimit and type',
  `sourceFormat` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creator` int(11) NOT NULL COMMENT 'User ID who created unit',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_template_uuid` (`templateUuid`),
  KEY `idx_template_size` (`templateUuid`,`sizeUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Template size variants (one per banner size)';
