CREATE TABLE `url_scrape` (
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `errorMessage` text,
  `storageLocation` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `performance` json DEFAULT NULL,
  `created` datetime NOT NULL,
  `updated` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `url` (`url`) USING BTREE,
  KEY `status` (`status`) USING BTREE,
  KEY `updated` (`updated`) USING BTREE,
  KEY `created` (`created`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
