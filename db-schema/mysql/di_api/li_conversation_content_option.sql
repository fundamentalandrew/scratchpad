CREATE TABLE `li_conversation_content_option` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_user_id` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `content_reference` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `option_text` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `reply_type` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `landing_page` text COLLATE utf8mb4_unicode_520_ci,
  `next_content_urn` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `token_user_id` (`token_user_id`) USING BTREE,
  KEY `content_reference` (`content_reference`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2295586 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
