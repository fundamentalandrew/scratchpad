CREATE TABLE `client_office` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` varchar(20) COLLATE utf8_unicode_ci DEFAULT 'live',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nameUnique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6343 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
