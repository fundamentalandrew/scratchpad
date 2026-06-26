CREATE TABLE `asset_builder_template_theme` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `template_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `client_uuid` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL,
  `name` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `name` (`name`),
  KEY `template_uuid` (`template_uuid`),
  KEY `client_uuid` (`client_uuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
