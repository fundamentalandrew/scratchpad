CREATE TABLE `ax_domain` (
  `listId` bigint(20) unsigned NOT NULL,
  `listType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `listAttributes` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `listUploadType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `listName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delimiter` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountId` int(11) NOT NULL,
  `createDate` datetime NOT NULL,
  `updateDate` datetime NOT NULL,
  `alternativeId` bigint(20) unsigned DEFAULT NULL,
  `notes` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) DEFAULT NULL,
  `buzzKey` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`listId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
