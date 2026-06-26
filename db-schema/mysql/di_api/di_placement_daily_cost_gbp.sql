CREATE TABLE `di_placement_daily_cost_gbp` (
  `date` date NOT NULL,
  `placementId` int(10) unsigned NOT NULL,
  `costGbp` decimal(15,5) NOT NULL,
  `bookings` varchar(1024) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`date`,`placementId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
