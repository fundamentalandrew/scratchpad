CREATE TABLE `job` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `class` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `params` json NOT NULL COMMENT '(DC2Type:json)',
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `result` json DEFAULT NULL COMMENT '(DC2Type:json)',
  `priority` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `token` (`token`),
  KEY `class` (`class`),
  KEY `status` (`status`),
  KEY `priority` (`priority`)
) ENGINE=InnoDB AUTO_INCREMENT=71782 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
