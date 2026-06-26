CREATE TABLE `ds_fm_activity_aggregator_current_account_import_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `imported_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `imported_at` (`imported_at`)
) ENGINE=InnoDB AUTO_INCREMENT=111601 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
