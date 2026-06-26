CREATE TABLE `report_slide_setting` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_id` int(10) unsigned NOT NULL,
  `report_slide_id` int(10) unsigned NOT NULL,
  `setting` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `list` longtext COLLATE utf8_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `version` int(10) unsigned NOT NULL,
  `value_big` text COLLATE utf8_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  KEY `report_slide_id` (`report_slide_id`),
  KEY `setting` (`setting`)
) ENGINE=InnoDB AUTO_INCREMENT=458654 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
