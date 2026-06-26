CREATE TABLE `fb_report_ad_run` (
  `date` date NOT NULL,
  `ad_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`date`,`ad_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
