CREATE TABLE `li_region` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `region_id` int(10) unsigned NOT NULL,
  `country_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_region` (`region_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5164 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
