CREATE TABLE `dc_reports_data_dynamic_profile` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `dynamic_profile` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `dynamic_profile_id` int(11) NOT NULL,
  `impressions` int(11) NOT NULL,
  `clicks` int(11) NOT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `profileId` (`profileId`),
  KEY `accountId` (`accountId`),
  KEY `dynamic_profile` (`dynamic_profile`),
  KEY `dynamic_profile_id` (`dynamic_profile_id`),
  KEY `impressions` (`impressions`),
  KEY `clicks` (`clicks`)
) ENGINE=InnoDB AUTO_INCREMENT=411251 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
