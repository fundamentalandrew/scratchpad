CREATE TABLE `asset_builder_template_theme_unit` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `template_theme_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `size_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `template_theme_unit_size` (`template_theme_uuid`,`size_uuid`),
  KEY `size_uuid` (`size_uuid`),
  KEY `template_theme_uuid` (`template_theme_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
