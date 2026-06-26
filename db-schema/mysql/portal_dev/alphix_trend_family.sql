CREATE TABLE `alphix_trend_family` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `clientUuid` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL,
  `creator` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `archived` tinyint(4) NOT NULL DEFAULT '0',
  `accessLevel` varchar(20) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'private',
  PRIMARY KEY (`uuid`),
  KEY `clienUuid_idx` (`clientUuid`),
  KEY `creator_idx` (`creator`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
