CREATE TABLE `asset_builder_template_theme_setting` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `template_theme_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `template_theme_unit_uuid` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL,
  `setting` varchar(500) COLLATE utf8_unicode_ci NOT NULL,
  `value` text COLLATE utf8_unicode_ci,
  `created_by` int(10) unsigned DEFAULT NULL,
  `updated_by` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `template_theme_uuid` (`template_theme_uuid`),
  KEY `setting` (`setting`) USING BTREE,
  KEY `template_theme_unit_uuid` (`template_theme_unit_uuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
