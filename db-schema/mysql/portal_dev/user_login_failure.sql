CREATE TABLE `user_login_failure` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `login_at` datetime NOT NULL,
  `ip_address` varchar(39) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4312 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
