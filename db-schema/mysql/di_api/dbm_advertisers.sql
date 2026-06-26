CREATE TABLE `dbm_advertisers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `advertiserId` bigint(20) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'USD',
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dbm_advertisers_id_unique` (`advertiserId`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=33017 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
