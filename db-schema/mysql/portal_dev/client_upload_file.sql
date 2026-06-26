CREATE TABLE `client_upload_file` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `client_uuid` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `user_id` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `storage_path` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_uuid` (`client_uuid`),
  KEY `user_id` (`user_id`),
  KEY `type` (`type`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=509 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
