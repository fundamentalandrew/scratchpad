CREATE TABLE `dc_reports_template` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `dimensions` json NOT NULL COMMENT '(DC2Type:json)',
  `metrics` json NOT NULL COMMENT '(DC2Type:json)',
  `schedule_type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `target_table` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `version` int(10) unsigned NOT NULL,
  `import_type` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `big_query_target_table` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `version` (`version`)
) ENGINE=InnoDB AUTO_INCREMENT=170 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
