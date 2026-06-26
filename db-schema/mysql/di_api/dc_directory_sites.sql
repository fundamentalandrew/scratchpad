CREATE TABLE `dc_directory_sites` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `directorySiteId` int(10) unsigned NOT NULL,
  `countryId` int(10) unsigned DEFAULT NULL,
  `active` tinyint(1) NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniqueDirectorySiteId` (`directorySiteId`,`accountId`,`profileId`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`),
  KEY `directorySiteId` (`directorySiteId`)
) ENGINE=InnoDB AUTO_INCREMENT=1809297153 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
