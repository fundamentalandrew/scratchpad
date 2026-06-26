CREATE TABLE `dc_reports_run_floodlight` (
  `created` date NOT NULL,
  `floodlightConfigurationId` int(11) unsigned NOT NULL,
  `relativeDateRange` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`created`,`floodlightConfigurationId`,`relativeDateRange`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
