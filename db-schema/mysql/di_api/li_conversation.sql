CREATE TABLE `li_conversation` (
  `conversation_id` bigint(20) unsigned NOT NULL,
  `token_user_id` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `parent_account` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `headline_text` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `first_message_content` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`conversation_id`) USING BTREE,
  KEY `token_user_id` (`token_user_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
