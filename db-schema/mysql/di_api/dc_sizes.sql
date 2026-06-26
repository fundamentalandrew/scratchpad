CREATE TABLE `dc_sizes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `sizeId` int(10) unsigned NOT NULL,
  `width` int(10) unsigned NOT NULL,
  `height` int(10) unsigned NOT NULL,
  `iab` tinyint(1) NOT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dc_sizes_id_unique` (`sizeId`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=1641312131 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
