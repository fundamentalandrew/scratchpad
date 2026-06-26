CREATE TABLE `ip_client_source_amx_account` (
  `ipClientSourceId` int(10) unsigned NOT NULL,
  `accountId` int(10) unsigned NOT NULL,
  `amxSegmentCategoryKey` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `uploadedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`ipClientSourceId`,`accountId`),
  KEY `uploadedAt` (`uploadedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
