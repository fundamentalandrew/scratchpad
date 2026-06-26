CREATE TABLE `targeting_profile_firmo_master` (
  `targeting_profile_firmo_id` int(10) unsigned NOT NULL,
  `firmoMasterUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`targeting_profile_firmo_id`,`firmoMasterUuid`),
  KEY `firmoMasterUuid` (`firmoMasterUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
