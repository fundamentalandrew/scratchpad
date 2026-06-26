CREATE TABLE `li_in_mail_content_variable` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_user_id` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `in_mail_content_reference` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `property` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `value` longtext COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `token_user_id` (`token_user_id`) USING BTREE,
  KEY `in_mail_content_reference` (`in_mail_content_reference`) USING BTREE,
  KEY `property` (`property`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=18285 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
