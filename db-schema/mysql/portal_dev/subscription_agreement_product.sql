CREATE TABLE `subscription_agreement_product` (
  `agreementUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `productUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `levelUuid` varchar(50) CHARACTER SET utf8mb4 DEFAULT NULL,
  `termsVersion` int(10) unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`agreementUuid`,`productUuid`),
  KEY `termsVersion` (`termsVersion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
