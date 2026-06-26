CREATE TABLE `li_creative_variable` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_user_id` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `creative_id` int(10) unsigned NOT NULL,
  `property` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `value` longtext COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `token_user_id` (`token_user_id`),
  KEY `creative_id` (`creative_id`),
  KEY `property` (`property`)
) ENGINE=InnoDB AUTO_INCREMENT=19836638 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
