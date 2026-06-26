CREATE TABLE `dc_creatives_compatibility` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `creativesId` int(10) unsigned NOT NULL,
  `compatibility` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dc_creatives_compatibility_id_unique` (`creativesId`,`compatibility`),
  KEY `dc_creatives_compatibility_creativesid_index` (`creativesId`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=43429867 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
