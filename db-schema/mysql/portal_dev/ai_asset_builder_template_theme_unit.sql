CREATE TABLE `ai_asset_builder_template_theme_unit` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Theme unit UUID',
  `templateThemeUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: template_theme.uuid',
  `sizeUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: creative_size.uuid (shared table)',
  `creator` int(11) NOT NULL COMMENT 'User ID who created theme unit',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_theme_uuid` (`templateThemeUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Theme-to-size bindings (auto-created when units or themes are added)';
