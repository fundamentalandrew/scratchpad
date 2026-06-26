CREATE TABLE `li_country` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `country_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=119365923 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
