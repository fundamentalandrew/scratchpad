CREATE TABLE `dc_ad_placement` (
  `adId` int(11) NOT NULL,
  `placementId` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`adId`,`placementId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
