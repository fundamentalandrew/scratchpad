CREATE TABLE `domain` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `domain` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `logo` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `type` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'client',
  PRIMARY KEY (`id`),
  UNIQUE KEY `domainUnique` (`domain`)
) ENGINE=InnoDB AUTO_INCREMENT=10931319 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
