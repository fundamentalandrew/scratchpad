CREATE TABLE `alpha_collection` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `client_uuid` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `viewability` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `client_uuid` (`client_uuid`),
  KEY `viewability` (`viewability`),
  KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=686 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
