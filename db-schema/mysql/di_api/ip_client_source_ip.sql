CREATE TABLE `ip_client_source_ip` (
  `ipClientSourceId` int(10) unsigned NOT NULL,
  `ip` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `businessName` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `imported` datetime NOT NULL,
  PRIMARY KEY (`ipClientSourceId`,`ip`),
  KEY `businessName` (`businessName`),
  KEY `imported` (`imported`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
