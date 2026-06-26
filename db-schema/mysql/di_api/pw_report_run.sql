CREATE TABLE `pw_report_run` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_reference` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `website_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `report_reference` (`report_reference`),
  KEY `website_id` (`website_id`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=6601 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
