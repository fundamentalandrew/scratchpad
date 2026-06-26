CREATE TABLE `alphix_trend_family_setting` (
  `alphixTrendFamilyUuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `setting` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `value` text COLLATE utf8_unicode_ci,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`alphixTrendFamilyUuid`,`setting`),
  KEY `alphixTrendFamilyUuid_idx` (`alphixTrendFamilyUuid`),
  KEY `createdAt_idx` (`createdAt`),
  KEY `setting_idx` (`setting`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
