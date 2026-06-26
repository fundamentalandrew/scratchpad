CREATE TABLE `di_placement_daily_cost` (
  `date` date NOT NULL,
  `placementId` int(10) unsigned NOT NULL,
  `bookingUniqueNumber` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chargeableImpressions` int(10) unsigned NOT NULL,
  `fixedCost` decimal(15,5) NOT NULL,
  `fixedFees` decimal(15,5) DEFAULT '0.00000',
  `cpm` decimal(15,5) NOT NULL,
  `cpc` decimal(15,5) NOT NULL,
  `cpv` decimal(15,5) NOT NULL,
  `currency` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chargeableVideo` int(10) unsigned NOT NULL,
  `chargeableClicks` int(10) unsigned NOT NULL,
  `placementCostRatio` decimal(6,5) NOT NULL DEFAULT '1.00000',
  PRIMARY KEY (`placementId`,`bookingUniqueNumber`,`date`),
  KEY `di_placement_daily_cost_date_IDX` (`date`) USING BTREE,
  KEY `di_placement_daily_cost_placementId_IDX` (`placementId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
