CREATE TABLE `news_whitelist` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Whitelist UUID',
  `clientUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'NULL = system-global, NOT NULL = client-owned',
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Display name',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'active | archived',
  `creator` int(11) NOT NULL COMMENT 'User ID who created the whitelist (0 = system)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `uk_client_name` (`clientUuid`,`name`),
  KEY `idx_client_uuid` (`clientUuid`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Named news source whitelists. clientUuid NULL = system-global.';
