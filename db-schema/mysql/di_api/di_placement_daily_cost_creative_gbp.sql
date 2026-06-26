CREATE TABLE `di_placement_daily_cost_creative_gbp` (
  `date` date NOT NULL,
  `placementId` int(10) unsigned NOT NULL,
  `creativeId` int(10) unsigned NOT NULL,
  `impressionShare` decimal(15,10) DEFAULT NULL,
  `clickShare` decimal(15,10) DEFAULT NULL,
  `costGbp` decimal(15,5) NOT NULL,
  `bookings` varchar(1024) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`placementId`,`creativeId`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
