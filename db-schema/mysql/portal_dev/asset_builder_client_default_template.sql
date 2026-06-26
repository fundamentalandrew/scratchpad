CREATE TABLE `asset_builder_client_default_template` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `client_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `template_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `template_type` varchar(500) COLLATE utf8_unicode_ci NOT NULL,
  `template_theme_uuid` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `updated_by` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `client_uuid` (`client_uuid`) USING BTREE,
  KEY `template_uuid` (`template_uuid`) USING BTREE,
  KEY `template_type` (`template_type`) USING BTREE,
  KEY `template_theme_uuid` (`template_theme_uuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
