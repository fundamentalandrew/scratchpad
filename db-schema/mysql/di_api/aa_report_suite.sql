CREATE TABLE `aa_report_suite` (
  `rsid` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `organizationId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `report_run_start_date` date DEFAULT NULL,
  `rsuniq` int(10) unsigned NOT NULL,
  `limitSegmentJson` text COLLATE utf8_unicode_ci,
  PRIMARY KEY (`organizationId`,`rsid`),
  UNIQUE KEY `rsuniq` (`rsuniq`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
