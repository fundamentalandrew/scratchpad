CREATE TABLE `troubleshooter_status` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `link_type` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `link_id` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `note` text COLLATE utf8_unicode_ci NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `link_type` (`link_type`),
  KEY `link_id` (`link_id`),
  KEY `status` (`status`),
  KEY `user_id` (`user_id`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=33985 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
