CREATE TABLE `import_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `importSource` int(11) NOT NULL,
  `startTime` datetime NOT NULL,
  `endTime` datetime NOT NULL,
  `periodStart` datetime NOT NULL,
  `periodEnd` datetime NOT NULL,
  `rowsAffected` int(11) NOT NULL,
  `extraData` text COLLATE utf8_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30171 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
