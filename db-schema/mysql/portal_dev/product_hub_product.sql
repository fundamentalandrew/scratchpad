CREATE TABLE `product_hub_product` (
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phase` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `settingClient` json NOT NULL,
  `settingInternal` json NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `slug` (`slug`),
  KEY `phase` (`phase`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
