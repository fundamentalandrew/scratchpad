CREATE TABLE `dc_reports_template_profile` (
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `profileId` int(10) unsigned NOT NULL,
  `version` int(10) unsigned NOT NULL,
  PRIMARY KEY (`profileId`,`name`),
  KEY `version` (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
