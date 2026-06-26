CREATE TABLE `user_password_history` (
  `user_id` int(10) unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  `password_hash` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
