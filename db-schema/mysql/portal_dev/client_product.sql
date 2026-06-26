CREATE TABLE `client_product` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `product_uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `client_uuid` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `creator` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT '1',
  `version_status` enum('past','draft','live') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'live',
  `status` enum('live','archived') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'live',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_uuid` (`client_uuid`),
  KEY `creator` (`creator`),
  KEY `name` (`name`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=259 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
