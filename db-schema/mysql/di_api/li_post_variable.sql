CREATE TABLE `li_post_variable` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_user_id` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `post_reference` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `property` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `value` longtext COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `token_user_id` (`token_user_id`) USING BTREE,
  KEY `property` (`property`) USING BTREE,
  KEY `post_reference` (`post_reference`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5591848 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
