CREATE TABLE `report_template_slide_setting` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_template_id` int(10) unsigned NOT NULL,
  `version` int(10) unsigned NOT NULL,
  `report_template_slide_id` int(10) unsigned NOT NULL,
  `setting` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `list` text COLLATE utf8_unicode_ci COMMENT '(DC2Type:simple_array)',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `report_template_id` (`report_template_id`),
  KEY `report_template_slide_id` (`report_template_slide_id`),
  KEY `setting` (`setting`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
