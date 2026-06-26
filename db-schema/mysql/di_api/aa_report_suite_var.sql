CREATE TABLE `aa_report_suite_var` (
  `rsid` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `reference` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `organizationId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `var` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`organizationId`,`rsid`,`reference`),
  KEY `var` (`var`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
