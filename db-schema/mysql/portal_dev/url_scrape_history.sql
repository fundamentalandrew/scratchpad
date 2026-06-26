CREATE TABLE `url_scrape_history` (
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `urlScrapeUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storageLocation` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  KEY `urlScrapeUuid` (`urlScrapeUuid`) USING BTREE,
  KEY `created` (`created`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
