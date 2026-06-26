CREATE TABLE `db_export` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `reference` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `sendTo` text COLLATE utf8_unicode_ci NOT NULL,
  `query` text COLLATE utf8_unicode_ci,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `type` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `dbType` varchar(50) COLLATE utf8_unicode_ci DEFAULT 'mysql',
  `bigQueryProject` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `exportProject` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `exportBucket` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `exportOverwriteFilePath` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `type` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
