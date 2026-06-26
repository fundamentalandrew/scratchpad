CREATE TABLE `alert` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_connection` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_connection_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json DEFAULT NULL COMMENT '(DC2Type:json)',
  `override_level` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `type` (`type`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=8456 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
