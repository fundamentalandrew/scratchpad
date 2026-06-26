CREATE TABLE `aa_report_run` (
  `rsid` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `report_reference` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `organizationId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`organizationId`,`rsid`,`report_reference`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
