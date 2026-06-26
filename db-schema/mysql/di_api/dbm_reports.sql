CREATE TABLE `dbm_reports` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `query_id` bigint(20) NOT NULL,
  `title` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `date_range` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `format` varchar(4) COLLATE utf8_unicode_ci DEFAULT NULL,
  `type` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
  `frequency` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `target_table` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `allow_import` tinyint(1) NOT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `query_id` (`query_id`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=6095753 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
