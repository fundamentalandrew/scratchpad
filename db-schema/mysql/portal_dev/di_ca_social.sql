CREATE TABLE `di_ca_social` (
  `bookingUniqueNumber` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `socialNetwork` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `socialCampaignId` bigint(20) unsigned NOT NULL,
  `userId` int(11) NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`bookingUniqueNumber`,`socialNetwork`,`socialCampaignId`),
  KEY `updatedAt` (`updatedAt`),
  KEY `createdAt` (`createdAt`),
  KEY `userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
