CREATE TABLE `aa_report_suite_dimension` (
  `rsid` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `organizationId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `dimensionId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `support` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `pathable` tinyint(1) NOT NULL,
  `segmentable` tinyint(1) NOT NULL,
  `reportable` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `supportsDataGovernance` tinyint(1) NOT NULL,
  PRIMARY KEY (`organizationId`,`rsid`,`dimensionId`),
  KEY `title` (`title`),
  KEY `type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
