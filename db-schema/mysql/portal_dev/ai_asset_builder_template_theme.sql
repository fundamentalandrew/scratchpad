CREATE TABLE `ai_asset_builder_template_theme` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Theme UUID',
  `templateUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: template.uuid',
  `clientUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Multi-tenant isolation',
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Theme name',
  `creator` int(11) NOT NULL COMMENT 'User ID who created theme',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_template_uuid` (`templateUuid`),
  KEY `idx_client_uuid` (`clientUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Template design variant themes (per client)';
