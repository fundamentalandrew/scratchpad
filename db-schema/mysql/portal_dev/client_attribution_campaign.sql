CREATE TABLE `client_attribution_campaign` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `clientUuid` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `creator` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `clientUuid` (`clientUuid`),
  KEY `name` (`name`),
  KEY `creator` (`creator`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
