CREATE TABLE `di_creative_group` (
  `creativeGroupId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `groupType` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `groupTypeId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `imageLocation` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`creativeGroupId`),
  UNIQUE KEY `groupName` (`groupType`,`groupTypeId`,`name`),
  KEY `groupType` (`groupType`),
  KEY `groupTypeId` (`groupTypeId`),
  KEY `createdAt` (`createdAt`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
