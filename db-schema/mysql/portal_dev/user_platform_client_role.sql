CREATE TABLE `user_platform_client_role` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `platform` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `clientUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `role_id` int(10) unsigned NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `relationshipUnique` (`user_id`,`platform`,`clientUuid`,`role_id`),
  KEY `role_id` (`role_id`),
  KEY `clientUuid` (`clientUuid`),
  KEY `platform` (`platform`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=76243 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
