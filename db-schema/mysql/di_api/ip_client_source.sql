CREATE TABLE `ip_client_source` (
  `ipClientSourceId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `clientUuid` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `reference` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`ipClientSourceId`),
  KEY `clientUuid` (`clientUuid`),
  KEY `reference` (`reference`),
  KEY `createdAt` (`createdAt`),
  KEY `updatedAt` (`updatedAt`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
