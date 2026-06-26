CREATE TABLE `dc_advertiser_landing_pages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `alpId` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` mediumtext COLLATE utf8mb4_unicode_ci,
  `archived` int(10) unsigned NOT NULL,
  `advertiserId` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  `latest_change_log` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `alpId` (`alpId`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=11660 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
