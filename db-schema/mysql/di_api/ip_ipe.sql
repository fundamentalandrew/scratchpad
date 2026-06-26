CREATE TABLE `ip_ipe` (
  `ipIdeId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ip` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `businessName` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `imported` datetime NOT NULL,
  PRIMARY KEY (`ipIdeId`),
  UNIQUE KEY `uniqueIp` (`ip`),
  KEY `businessName` (`businessName`),
  KEY `imported` (`imported`)
) ENGINE=InnoDB AUTO_INCREMENT=1787 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
