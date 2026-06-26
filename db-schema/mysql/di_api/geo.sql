CREATE TABLE `geo` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `regionId` int(10) unsigned DEFAULT NULL,
  `subRegionId` int(10) unsigned DEFAULT NULL,
  `code` varchar(10) COLLATE utf8_unicode_ci NOT NULL,
  `alpha3code` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `type` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `code` (`code`),
  KEY `type` (`type`),
  KEY `name` (`name`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=287 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
