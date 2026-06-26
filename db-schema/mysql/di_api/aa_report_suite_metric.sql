CREATE TABLE `aa_report_suite_metric` (
  `rsid` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `organizationId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `metricId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `category` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `support` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `allocation` tinyint(1) NOT NULL,
  `precision` int(11) NOT NULL,
  `calculated` tinyint(1) NOT NULL,
  `segmentable` tinyint(1) NOT NULL,
  `supportsDataGovernance` tinyint(1) NOT NULL,
  `polarity` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`organizationId`,`rsid`,`metricId`),
  KEY `title` (`title`),
  KEY `type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
