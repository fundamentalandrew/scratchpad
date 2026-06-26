CREATE TABLE `alphix_action_link_domain` (
  `actionUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `domainId` int(10) unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`actionUuid`,`domainId`) USING BTREE,
  KEY `createdAt` (`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
