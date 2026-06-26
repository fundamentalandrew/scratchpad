CREATE TABLE `report_template_version` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_template_id` int(10) unsigned NOT NULL,
  `version` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `report_template_id` (`report_template_id`),
  KEY `version` (`version`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
