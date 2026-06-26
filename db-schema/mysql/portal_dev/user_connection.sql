CREATE TABLE `user_connection` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `connection_type` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `connection_id` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `access` (`user_id`,`connection_type`,`connection_id`),
  KEY `user_id` (`user_id`),
  KEY `connection_type` (`connection_type`),
  KEY `connection_id` (`connection_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
