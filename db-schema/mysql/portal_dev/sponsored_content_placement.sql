CREATE TABLE `sponsored_content_placement` (
  `sponsoredContentId` int(10) unsigned NOT NULL,
  `placementId` int(10) unsigned NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`sponsoredContentId`,`placementId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
