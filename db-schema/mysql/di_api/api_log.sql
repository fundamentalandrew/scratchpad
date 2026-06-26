CREATE TABLE `api_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uri` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `query` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `data` json DEFAULT NULL COMMENT '(DC2Type:json)',
  PRIMARY KEY (`id`),
  KEY `uri` (`uri`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3352823 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
