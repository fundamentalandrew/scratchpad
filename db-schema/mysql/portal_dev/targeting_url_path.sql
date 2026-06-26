CREATE TABLE `targeting_url_path` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `urlPath` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `segmentKey` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `urlPath` (`urlPath`),
  KEY `createdAt` (`createdAt`) USING BTREE,
  KEY `segmentKey` (`segmentKey`)
) ENGINE=InnoDB AUTO_INCREMENT=167577 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
