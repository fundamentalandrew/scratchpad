CREATE TABLE `alphix_trend_family_users` (
  `userId` int(10) unsigned NOT NULL,
  `trendFamilyUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`userId`,`trendFamilyUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
