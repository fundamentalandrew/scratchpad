CREATE TABLE `sponsored_content` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `clientUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `adType` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `contentName` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `headline` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `url` varchar(2048) COLLATE utf8_unicode_ci DEFAULT NULL,
  `assetClass` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `managementStyle` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `description` text COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `status` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `clientUuid` (`clientUuid`),
  KEY `status` (`status`),
  KEY `adType` (`adType`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
