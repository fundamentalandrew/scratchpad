CREATE TABLE `dbm_sites` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `siteId` bigint(20) unsigned NOT NULL,
  `name` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dbm_sites_id_unique` (`siteId`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=519933 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
