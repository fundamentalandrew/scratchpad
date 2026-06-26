CREATE TABLE `asset_builder_image` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `client_uuid` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL,
  `image_set_uuid` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL,
  `name` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL,
  `tag` text COLLATE utf8_unicode_ci,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `name` (`name`),
  KEY `image_set_uuid` (`image_set_uuid`),
  KEY `client_uuid` (`client_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
