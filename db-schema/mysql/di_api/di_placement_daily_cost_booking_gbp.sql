CREATE TABLE `di_placement_daily_cost_booking_gbp` (
  `date` date NOT NULL,
  `placementId` int(10) unsigned NOT NULL,
  `bookingUniqueNumber` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `costGbp` decimal(15,5) NOT NULL,
  PRIMARY KEY (`placementId`,`bookingUniqueNumber`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
