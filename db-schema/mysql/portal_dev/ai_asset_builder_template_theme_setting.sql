CREATE TABLE `ai_asset_builder_template_theme_setting` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Setting UUID',
  `templateThemeUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: template_theme.uuid',
  `templateThemeUnitUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ref: template_theme_unit.uuid (NULL = theme-wide)',
  `setting` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Setting type: content/css-style/disclaimer/dynamic-image/logo/static-image',
  `value` json DEFAULT NULL COMMENT 'Setting value (array of key/value or key/reference pairs)',
  `creator` int(11) NOT NULL COMMENT 'User ID who created setting',
  `updatedBy` int(11) DEFAULT NULL COMMENT 'User ID who last updated',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_theme_uuid` (`templateThemeUuid`),
  KEY `idx_theme_unit_uuid` (`templateThemeUnitUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Theme content values for template tag replacements';
