CREATE TABLE `targeting_profile_product_overlay` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `description` mediumtext COLLATE utf8_unicode_ci,
  `creator` int(10) unsigned DEFAULT NULL,
  `segmentKey` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `itemUploaded` int(10) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `uploadDate` datetime DEFAULT NULL,
  `clientUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `name` (`name`),
  KEY `clientUuid` (`clientUuid`)
) ENGINE=InnoDB AUTO_INCREMENT=161 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
