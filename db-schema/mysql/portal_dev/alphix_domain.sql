CREATE TABLE `alphix_domain` (
  `domainId` int(10) unsigned NOT NULL,
  `clientUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `allowCrawling` tinyint(1) DEFAULT '0',
  `allowTrends` tinyint(1) DEFAULT '0',
  `allowLlmo` tinyint(1) DEFAULT '0',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`domainId`,`clientUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
