CREATE TABLE `di_cpm` (
  `date` date NOT NULL,
  `placementId` bigint(20) unsigned NOT NULL,
  `cpm` decimal(15,4) DEFAULT NULL,
  `currency` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `bookings` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `run` int(10) unsigned NOT NULL,
  `cpm_gbp` decimal(15,4) DEFAULT NULL,
  PRIMARY KEY (`date`,`placementId`),
  KEY `date` (`date`),
  KEY `placementId` (`placementId`),
  KEY `run` (`run`),
  KEY `currency` (`currency`),
  KEY `cpm_gbp` (`cpm_gbp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
