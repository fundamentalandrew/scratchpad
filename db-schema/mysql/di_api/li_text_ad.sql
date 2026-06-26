CREATE TABLE `li_text_ad` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creative_id` int(10) unsigned NOT NULL,
  `image_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `headline` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `landing_page` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_modified` datetime NOT NULL,
  `last_fetched` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `creative_id` (`creative_id`) USING BTREE,
  KEY `token_user_id` (`token_user_id`) USING BTREE,
  KEY `last_fetched` (`last_fetched`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
