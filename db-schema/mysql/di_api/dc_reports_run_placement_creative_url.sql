CREATE TABLE `dc_reports_run_placement_creative_url` (
  `created` date NOT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `relativeDateRange` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `created` (`created`,`id`,`relativeDateRange`)
) ENGINE=InnoDB AUTO_INCREMENT=2120 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
