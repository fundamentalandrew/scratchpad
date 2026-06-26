CREATE TABLE `dc_reports_run_dynamic` (
  `created` date NOT NULL,
  `dynamicProfileId` int(10) unsigned NOT NULL,
  `relativeDateRange` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`created`,`dynamicProfileId`,`relativeDateRange`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
