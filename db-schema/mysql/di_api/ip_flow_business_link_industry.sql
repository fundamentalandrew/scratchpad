CREATE TABLE `ip_flow_business_link_industry` (
  `businessId` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `industryId` int(10) unsigned NOT NULL,
  `linked` datetime NOT NULL,
  PRIMARY KEY (`businessId`,`industryId`),
  KEY `linked` (`linked`),
  KEY `businessId` (`businessId`),
  KEY `industryId` (`industryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
