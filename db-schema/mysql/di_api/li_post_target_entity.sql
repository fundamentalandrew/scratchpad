CREATE TABLE `li_post_target_entity` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_user_id` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `post_reference` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `group` int(10) unsigned NOT NULL,
  `field` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `value` longtext COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `token_user_id` (`token_user_id`) USING BTREE,
  KEY `field` (`field`) USING BTREE,
  KEY `post_reference` (`post_reference`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=154152 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
