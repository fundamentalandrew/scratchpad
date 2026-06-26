CREATE TABLE `subscription_product_role` (
  `productUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `roleId` int(10) unsigned NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`productUuid`,`roleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
