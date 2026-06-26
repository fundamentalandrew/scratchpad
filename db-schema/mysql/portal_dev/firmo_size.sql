CREATE TABLE `firmo_size` (
  `uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employeeBand` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  KEY `firmo_size_createdAt_IDX` (`createdAt`) USING BTREE,
  KEY `firmo_size_employeeBand_IDX` (`employeeBand`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
