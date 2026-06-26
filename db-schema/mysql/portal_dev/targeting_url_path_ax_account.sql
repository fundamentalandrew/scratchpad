CREATE TABLE `targeting_url_path_ax_account` (
  `urlPath` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accountId` int(10) unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`urlPath`,`accountId`) USING BTREE,
  KEY `createdAt` (`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
