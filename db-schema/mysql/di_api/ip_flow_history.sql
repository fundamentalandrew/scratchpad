CREATE TABLE `ip_flow_history` (
  `ip` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `statusCode` int(10) unsigned NOT NULL,
  `businessId` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `officeId` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `check` datetime NOT NULL,
  KEY `statusCode` (`statusCode`),
  KEY `businessId` (`businessId`),
  KEY `officeId` (`officeId`),
  KEY `check` (`check`),
  KEY `ip` (`ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
