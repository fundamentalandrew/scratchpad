CREATE TABLE `di_creative_group_creative` (
  `creativeGroupId` int(10) unsigned NOT NULL,
  `creativeId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`creativeGroupId`,`creativeId`),
  KEY `createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
