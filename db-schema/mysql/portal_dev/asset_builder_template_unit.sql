CREATE TABLE `asset_builder_template_unit` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `template_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `size_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL,
  `schema` text COLLATE utf8_unicode_ci,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `name` (`name`),
  KEY `template_uuid` (`template_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
