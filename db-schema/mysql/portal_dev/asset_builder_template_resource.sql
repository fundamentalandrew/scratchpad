CREATE TABLE `asset_builder_template_resource` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `template_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `template_unit_uuid` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL,
  `type` varchar(500) COLLATE utf8_unicode_ci NOT NULL,
  `file_type` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `file_size` int(11) unsigned NOT NULL,
  `file_path` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `uploaded_by` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `type` (`type`),
  KEY `template_unit_uuid` (`template_unit_uuid`),
  KEY `template_uuid` (`template_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
