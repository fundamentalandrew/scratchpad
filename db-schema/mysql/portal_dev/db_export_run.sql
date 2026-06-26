CREATE TABLE `db_export_run` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `exportId` int(10) unsigned NOT NULL,
  `date` date NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `run_unique` (`exportId`,`date`)
) ENGINE=InnoDB AUTO_INCREMENT=5322 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
