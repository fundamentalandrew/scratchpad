CREATE TABLE `external_token` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `external_system` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `token` varchar(1024) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `client_uuid` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `client_office_id` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `expires` datetime NOT NULL,
  `token_user_id` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `token_user_name` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `refresh_token` varchar(1024) COLLATE utf8_unicode_ci DEFAULT NULL,
  `refresh_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `external_system` (`external_system`),
  KEY `status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=166 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
