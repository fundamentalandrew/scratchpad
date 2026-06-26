CREATE TABLE `aw_geo_target` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `criteria_id` bigint(20) unsigned NOT NULL,
  `criteria_type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `parent_criteria_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `canonical_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `country_code` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `geo` (`criteria_id`,`criteria_type`),
  KEY `criteria_id` (`criteria_id`),
  KEY `criteria_type` (`criteria_type`),
  KEY `parent_criteria_id` (`parent_criteria_id`),
  KEY `name` (`name`),
  KEY `status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=105121 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
