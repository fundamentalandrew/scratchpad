CREATE TABLE `dc_reports` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `reportId` int(11) NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `format` varchar(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `startDate` datetime DEFAULT NULL,
  `endDate` datetime DEFAULT NULL,
  `relativeDateRange` mediumtext COLLATE utf8mb4_unicode_ci,
  `targetTable` varchar(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allowImport` tinyint(1) NOT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dc_reports_id_unique` (`id`),
  UNIQUE KEY `dc_reports_reportid_unique` (`reportId`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=12783777 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
