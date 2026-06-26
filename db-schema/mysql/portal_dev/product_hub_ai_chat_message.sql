CREATE TABLE `product_hub_ai_chat_message` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sessionUuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_msg_session_created` (`sessionUuid`,`createdAt`),
  KEY `idx_msg_session` (`sessionUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
