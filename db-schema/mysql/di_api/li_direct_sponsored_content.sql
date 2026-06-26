CREATE TABLE `li_direct_sponsored_content` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_user_id` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `content_reference` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `last_modified` datetime NOT NULL,
  `last_fetched` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_content_reference` (`content_reference`),
  KEY `token_user_id` (`token_user_id`),
  KEY `last_fetched` (`last_fetched`)
) ENGINE=InnoDB AUTO_INCREMENT=176289 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
