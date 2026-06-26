CREATE TABLE `dbm_reports_files` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_id` bigint(20) NOT NULL,
  `query_id` bigint(20) NOT NULL,
  `remote_path` varchar(2048) COLLATE utf8_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_imported` tinyint(1) DEFAULT NULL,
  `last_imported` date DEFAULT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_id` (`report_id`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=25736 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
