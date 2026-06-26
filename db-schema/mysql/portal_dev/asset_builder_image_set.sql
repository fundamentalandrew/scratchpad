CREATE TABLE `asset_builder_image_set` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `client_uuid` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL,
  `name` varchar(500) COLLATE utf8_unicode_ci NOT NULL,
  `tag` text COLLATE utf8_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `name` (`name`),
  KEY `client_uuid` (`client_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
