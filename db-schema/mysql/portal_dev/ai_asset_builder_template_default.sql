CREATE TABLE `ai_asset_builder_template_default` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Default record UUID',
  `clientUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Multi-tenant isolation',
  `templateUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: template.uuid',
  `templateType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Template type (e.g. engaged-content)',
  `templateThemeUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ref: template_theme.uuid (NULL = template-level default)',
  `creator` int(11) NOT NULL COMMENT 'User ID who set default',
  `updatedBy` int(11) DEFAULT NULL COMMENT 'User ID who last updated',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_client_type` (`clientUuid`,`templateType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Default template and theme selections per client/type';
