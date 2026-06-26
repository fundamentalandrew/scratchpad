CREATE TABLE `product_hub_product_link_product` (
  `productUuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `childProductUuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`productUuid`,`childProductUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
