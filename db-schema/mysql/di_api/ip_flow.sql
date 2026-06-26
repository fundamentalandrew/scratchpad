CREATE TABLE `ip_flow` (
  `ip` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `statusCode` int(10) unsigned NOT NULL,
  `businessId` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `officeId` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `lastCheck` datetime NOT NULL,
  PRIMARY KEY (`ip`),
  KEY `statusCode` (`statusCode`),
  KEY `businessId` (`businessId`),
  KEY `officeId` (`officeId`),
  KEY `lastCheck` (`lastCheck`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
