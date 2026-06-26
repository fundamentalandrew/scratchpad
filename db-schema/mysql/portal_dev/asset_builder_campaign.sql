CREATE TABLE `asset_builder_campaign` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `client_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `url_clean_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `content` text COLLATE utf8_unicode_ci,
  `creator` int(10) unsigned DEFAULT NULL,
  `processing_status` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `status` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `name` (`name`),
  KEY `created_at` (`created_at`),
  KEY `client_uuid` (`client_uuid`),
  KEY `creator` (`creator`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
