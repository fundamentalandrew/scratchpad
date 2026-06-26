CREATE TABLE `client_attribution_group_creative_set` (
  `clientAttributionGroupId` int(10) unsigned NOT NULL,
  `creativeSetId` int(10) unsigned NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`clientAttributionGroupId`,`creativeSetId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
