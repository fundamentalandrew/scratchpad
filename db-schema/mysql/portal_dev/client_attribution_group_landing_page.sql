CREATE TABLE `client_attribution_group_landing_page` (
  `clientAttributionGroupId` int(10) unsigned NOT NULL,
  `urlCleanId` int(10) unsigned NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`clientAttributionGroupId`,`urlCleanId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
