CREATE TABLE `ds_bookings_related` (
  `uuid` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bookingUniqueNumber` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`,`bookingUniqueNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
