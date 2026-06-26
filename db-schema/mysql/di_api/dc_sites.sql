CREATE TABLE `dc_sites` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `siteId` int(10) unsigned NOT NULL,
  `keyName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `subaccountId` int(10) unsigned NOT NULL,
  `approved` tinyint(1) NOT NULL,
  `directorySiteId` int(10) unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `latest_change_log` datetime DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dc_sites_id_unique` (`siteId`),
  KEY `idx_dc_sites_siteId_name_approved` (`siteId`,`name`,`approved`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=12422 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
