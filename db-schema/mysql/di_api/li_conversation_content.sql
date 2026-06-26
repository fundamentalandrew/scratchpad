CREATE TABLE `li_conversation_content` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_user_id` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `content_reference` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `conversation_id` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `parent_account` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `text_body` text COLLATE utf8mb4_unicode_520_ci,
  `lead_generation_form` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `token_user_id` (`token_user_id`) USING BTREE,
  KEY `conversation_id` (`conversation_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1647974 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
