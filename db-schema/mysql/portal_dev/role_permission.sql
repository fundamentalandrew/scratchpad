CREATE TABLE `role_permission` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `role_id` int(10) unsigned NOT NULL,
  `permission` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `relationshipUnique` (`role_id`,`permission`),
  KEY `role_id` (`role_id`),
  KEY `permission` (`permission`)
) ENGINE=InnoDB AUTO_INCREMENT=20067 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
