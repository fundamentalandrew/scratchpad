CREATE TABLE `dc_profile_advertiser` (
  `advertiserId` int(10) unsigned NOT NULL,
  `exclude_type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`advertiserId`),
  KEY `exclude_type` (`exclude_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
