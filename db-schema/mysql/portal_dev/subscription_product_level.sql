CREATE TABLE `subscription_product_level` (
  `productUuid` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
  `levelUuid` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
  `name` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`productUuid`,`levelUuid`),
  KEY `name` (`name`) USING BTREE,
  KEY `createdAt` (`createdAt`) USING BTREE,
  KEY `updatedAt` (`updatedAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
