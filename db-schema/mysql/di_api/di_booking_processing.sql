CREATE TABLE `di_booking_processing` (
  `bookingUniqueNumber` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `costProcessed` datetime NOT NULL DEFAULT '2000-01-01 00:00:00',
  PRIMARY KEY (`bookingUniqueNumber`),
  KEY `costProcessed` (`costProcessed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
