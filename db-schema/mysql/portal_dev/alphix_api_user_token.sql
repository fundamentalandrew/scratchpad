CREATE TABLE `alphix_api_user_token` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userId` int(10) unsigned NOT NULL,
  `clientUuid` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenHash` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenHint` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime NOT NULL,
  `lastUsedAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `alphix_api_user_token_userId` (`userId`) USING BTREE,
  KEY `alphix_api_user_token_clientUuid` (`clientUuid`) USING BTREE,
  KEY `alphix_api_user_token_name` (`name`) USING BTREE,
  KEY `alphix_api_user_token_lastUsedAt` (`lastUsedAt`) USING BTREE,
  KEY `alphix_api_user_token_expiresAt` (`expiresAt`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
