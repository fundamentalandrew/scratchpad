CREATE TABLE `dbm_campaigns` (
  `campaignId` bigint(20) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`campaignId`),
  KEY `name` (`name`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
