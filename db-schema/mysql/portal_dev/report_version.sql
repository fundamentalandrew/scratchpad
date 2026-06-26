CREATE TABLE `report_version` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_id` int(10) unsigned NOT NULL,
  `version` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reportVersion` (`report_id`,`version`),
  KEY `report_id` (`report_id`),
  KEY `version` (`version`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5355 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
