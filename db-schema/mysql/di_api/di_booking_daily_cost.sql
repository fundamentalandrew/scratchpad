CREATE TABLE `di_booking_daily_cost` (
  `placementId` int(10) unsigned NOT NULL,
  `bookingUniqueNumber` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `cost` decimal(15,5) NOT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`placementId`,`bookingUniqueNumber`,`date`),
  KEY `placementId` (`placementId`) USING BTREE,
  KEY `bookingUniqueNumber` (`bookingUniqueNumber`) USING BTREE,
  KEY `date` (`date`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
