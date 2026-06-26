CREATE TABLE `alphix_action_link_url_clean` (
  `actionUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `urlCleanId` int(10) unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`actionUuid`,`urlCleanId`) USING BTREE,
  KEY `createdAt` (`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
