CREATE TABLE `report_slide` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_id` int(10) unsigned NOT NULL,
  `slide` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `sortOrder` int(10) unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `version` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  KEY `slide` (`slide`),
  KEY `sortOrder` (`sortOrder`)
) ENGINE=InnoDB AUTO_INCREMENT=50695 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
