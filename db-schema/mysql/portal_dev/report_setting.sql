CREATE TABLE `report_setting` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_id` int(10) unsigned NOT NULL,
  `setting` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `list` text COLLATE utf8_unicode_ci COMMENT '(DC2Type:simple_array)',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `version` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  KEY `setting` (`setting`)
) ENGINE=InnoDB AUTO_INCREMENT=61148 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
