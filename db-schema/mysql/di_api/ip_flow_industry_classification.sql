CREATE TABLE `ip_flow_industry_classification` (
  `code` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sectionCode` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sectionDescription` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `divisionCode` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `divisionDescription` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `groupCode` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `groupDescription` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `lastUpdate` datetime NOT NULL,
  PRIMARY KEY (`code`,`type`),
  KEY `lastUpdate` (`lastUpdate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
