CREATE TABLE `client_attribution_group_booking` (
  `clientAttributionGroupId` int(10) unsigned NOT NULL,
  `bookingUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`clientAttributionGroupId`,`bookingUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
