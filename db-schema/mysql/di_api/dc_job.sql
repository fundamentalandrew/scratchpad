CREATE TABLE `dc_job` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `params` json NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `result` json DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `type` (`type`),
  KEY `status` (`status`),
  KEY `createdAt` (`createdAt`),
  KEY `updatedAt` (`updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=67689 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
