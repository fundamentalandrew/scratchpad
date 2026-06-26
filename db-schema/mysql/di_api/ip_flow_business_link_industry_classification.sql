CREATE TABLE `ip_flow_business_link_industry_classification` (
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `businessId` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `linked` datetime NOT NULL,
  PRIMARY KEY (`businessId`,`type`,`code`),
  KEY `linked` (`linked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
