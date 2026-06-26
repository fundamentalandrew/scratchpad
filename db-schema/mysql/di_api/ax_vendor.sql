CREATE TABLE `ax_vendor` (
  `vendorId` int(10) unsigned NOT NULL,
  `vendorName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `feeType` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `feeAmount` double unsigned DEFAULT NULL,
  `global` tinyint(4) DEFAULT NULL,
  `active` tinyint(4) NOT NULL,
  `accountId` int(10) unsigned NOT NULL,
  `alternativeId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` longtext COLLATE utf8mb4_unicode_ci,
  `globalAccountId` int(11) DEFAULT NULL,
  `currency` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vendorBuzzKey` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `buzzKey` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `syncd` datetime NOT NULL,
  PRIMARY KEY (`vendorId`),
  KEY `ax_vendor_vendorId_IDX` (`vendorId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
