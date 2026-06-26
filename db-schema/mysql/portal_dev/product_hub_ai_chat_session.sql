CREATE TABLE `product_hub_ai_chat_session` (
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` int(10) unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productUuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastMessageAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`uuid`),
  KEY `idx_chat_user_recent` (`userId`),
  KEY `idx_chat_product` (`productUuid`),
  KEY `idx_chat_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
