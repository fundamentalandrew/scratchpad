CREATE TABLE `dbm_reports_run_advertiser` (
  `created` date NOT NULL,
  `advertiserId` bigint(20) unsigned NOT NULL,
  `relativeDateRange` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`created`,`advertiserId`,`type`,`relativeDateRange`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
