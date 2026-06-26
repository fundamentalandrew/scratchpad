CREATE TABLE `firmo_turnover` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `band` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  KEY `firmo_turnover_createdAt_IDX` (`createdAt`) USING BTREE,
  KEY `firmo_turnover_band_IDX` (`band`) USING BTREE,
  KEY `firmo_turnover_currency_IDX` (`currency`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
