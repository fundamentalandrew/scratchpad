CREATE TABLE `shepob_report_run` (
  `systemRef` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `systemUniqueId` varchar(200) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `systemSecondaryUniqueId` varchar(200) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `reportReference` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `reportSecondaryReference` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`systemRef`,`systemUniqueId`,`date`,`systemSecondaryUniqueId`,`reportReference`,`reportSecondaryReference`),
  KEY `shepob_report_run_createdAt_IDX` (`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
