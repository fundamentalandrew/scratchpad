CREATE TABLE `asset_builder_image_resource` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `image_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'original-image',
  `width` int(11) unsigned DEFAULT NULL,
  `height` int(11) unsigned DEFAULT NULL,
  `aspect_ratio` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `file_type` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `file_size` int(11) unsigned NOT NULL,
  `file_path` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `uploaded_by` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `image_uuid` (`image_uuid`),
  KEY `type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
