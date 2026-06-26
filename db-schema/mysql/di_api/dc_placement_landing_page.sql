CREATE TABLE `dc_placement_landing_page` (
  `landing_page_hash` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `placementId` int(11) NOT NULL,
  `landing_page` varchar(1024) COLLATE utf8_unicode_ci NOT NULL,
  `last_seen` date NOT NULL,
  `error_code` int(11) DEFAULT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`placementId`,`landing_page_hash`),
  KEY `landing_page` (`landing_page`),
  KEY `last_seen` (`last_seen`),
  KEY `error_code` (`error_code`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
