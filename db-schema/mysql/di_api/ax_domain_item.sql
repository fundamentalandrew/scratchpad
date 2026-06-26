CREATE TABLE `ax_domain_item` (
  `listItemId` bigint(20) unsigned NOT NULL,
  `listId` bigint(20) unsigned NOT NULL,
  `listItem` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `listItemName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createDate` datetime NOT NULL,
  `updateDate` datetime NOT NULL,
  `active` tinyint(1) DEFAULT NULL,
  `value` int(10) unsigned DEFAULT NULL,
  `pushedToServer` datetime NOT NULL,
  `buzzKey` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accountId` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`listItemId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
