CREATE TABLE `dc_dynamic_report_request` (
  `dynamic_profile_id` int(10) unsigned NOT NULL,
  `type` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `profileId` int(10) unsigned NOT NULL,
  PRIMARY KEY (`dynamic_profile_id`,`profileId`,`type`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
