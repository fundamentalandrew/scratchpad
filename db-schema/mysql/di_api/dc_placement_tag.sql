CREATE TABLE `dc_placement_tag` (
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `placementId` int(10) unsigned NOT NULL,
  `tag` longtext COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`placementId`,`type`),
  KEY `createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
