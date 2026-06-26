CREATE TABLE `url_clean` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `clean_url` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created` datetime NOT NULL,
  `domainId` int(10) unsigned DEFAULT NULL,
  `nosibleUuid` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `nosibleCategory` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `clean_url` (`clean_url`),
  KEY `created` (`created`),
  KEY `domainId` (`domainId`),
  KEY `nosibleUuid` (`nosibleUuid`) USING BTREE,
  KEY `nosibleCategory` (`nosibleCategory`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=297793286 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
