CREATE TABLE `user_client` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `client_uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `client_office_id` int(10) unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `relationshipUnique` (`user_id`,`client_uuid`,`client_office_id`),
  KEY `client_uuid` (`client_uuid`),
  KEY `client_office_id` (`client_office_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1922 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
